import { useEffect, useRef, useState } from 'react'
import { loadRegionShapes, type RegionShapes } from '../data'
import { regionAt } from '../place'
import type { Region } from '../types'
import { densify, fitView, hasWebGL, toLatLon, toVector } from './globe'

type Box = [number, number, number, number] // [south, west, north, east]
type Pin = { lat: number; lon: number }

type WorldMapProps = {
  regions: Region[]
  highlight?: string // region id: its real outline filled translucent red, and the globe turns to face it
  pin?: Pin // a typed point, shown as a map pin, and the globe turns to face it
  label: string // what the map shows, for screen readers
  onRegion?: (id: string) => void // clicking inside a region picks it
}

type Globe = {
  update: (p: { regions: Region[]; shapes?: RegionShapes; highlight?: string; pin?: Pin }) => void
  zoom: (factor: number) => void // below 1 moves closer
  dispose: () => void
}

// Camera distances from the globe's centre (radius 1): closest allowed, closest an automatic fit goes (small regions
// keep some surroundings, and the image stays sharp), farthest (whole globe), and for a lone pin.
const NEAR = 1.2
const FIT_NEAR = 1.3
const FAR = 4.3
const PIN_DISTANCE = 1.6

const boxRing = ([s, w, n, e]: Box) => [[w, s], [w, n], [e, n], [e, s], [w, s]]
// A region's real outline rings ([lon, lat]), or its box while the outlines load or if they fail.
const ringsOf = (r: Region, shapes?: RegionShapes) => shapes?.[r.id]?.coordinates.flat() ?? [boxRing(r.bbox)]

async function makeGlobe(host: HTMLDivElement, onPick: (lat: number, lon: number) => void): Promise<Globe> {
  // Loaded only on the Scene step, so three.js stays out of the first page load.
  const THREE = await import('three')
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(host.clientWidth || 600, host.clientHeight || 420)
  renderer.domElement.style.cursor = 'grab'
  host.append(renderer.domElement)
  // Drawn only when something changed (a move, new content, a resize), so a still globe costs no GPU time.
  let dirty = true

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, (host.clientWidth || 600) / (host.clientHeight || 420), 0.1, 100)
  camera.position.set(...toVector(15, 20, FAR))
  scene.add(new THREE.AmbientLight(0xffffff, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(-1, 1, 2) // follows the camera, so the side facing the user is always lit
  camera.add(sun)
  scene.add(camera)

  // NASA Blue Marble, equirectangular, on the sphere: 3840 px wide (1 MB), or 2048 px (260 KB) on a narrow screen.
  const earthMat = new THREE.MeshLambertMaterial({ color: 0x2f6a9a })
  new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}data/${host.clientWidth < 640 ? 'earth-2048.jpg' : 'earth.jpg'}`,
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = renderer.capabilities.getMaxAnisotropy()
      earthMat.map = t
      earthMat.color.set(0xffffff)
      earthMat.needsUpdate = true
      dirty = true
    },
    undefined,
    () => {}, // without the image the sphere stays ocean blue; the outlines still show
  )
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), earthMat)
  scene.add(earth)

  // The chosen region's fill, painted on a transparent equirectangular canvas just above the surface.
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!
  const overlayTex = new THREE.CanvasTexture(canvas)
  overlayTex.colorSpace = THREE.SRGBColorSpace
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.002, 96, 64),
      new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthWrite: false }),
    ),
  )

  // Every region's real outline, dashed yellow over navy, so it shows on both sand and sea.
  const outlines = new THREE.Group()
  scene.add(outlines)
  const dashed = new THREE.LineDashedMaterial({ color: 0xeafe07, dashSize: 0.018, gapSize: 0.012 })
  const under = new THREE.LineBasicMaterial({ color: 0x07173f }) // opaque: transparent lines draw last and would cover the dashes
  // The chosen region's edge as a crisp line, sharp at any zoom (the canvas fill blurs up close).
  const edge = new THREE.Group()
  scene.add(edge)
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xe8456b })

  const pin = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  stem.position.y = 0.06
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0960e1 }))
  head.position.y = 0.135
  pin.add(stem, head)
  pin.visible = false
  scene.add(pin)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableDamping = true
  controls.minDistance = NEAR // never inside the globe; the canvas clips everything to the box
  controls.maxDistance = FAR

  // Moving to a view: the camera swings around the globe (quaternion slerp) while its distance eases to the new one.
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  type Aim = { dir: InstanceType<typeof THREE.Vector3>; turn: InstanceType<typeof THREE.Quaternion>; d0: number; d1: number; start: number }
  let aim: Aim | null = null
  let aimedAt = ''
  const clampDistance = (d: number) => Math.min(FAR, Math.max(NEAR, d))
  const moveTo = (lat: number, lon: number, distance: number) => {
    const dir = camera.position.clone().normalize()
    const to = new THREE.Vector3(...toVector(lat, lon))
    const d1 = clampDistance(distance)
    if (reduced) return void camera.position.copy(to.multiplyScalar(d1))
    aim = { dir, turn: new THREE.Quaternion().setFromUnitVectors(dir, to), d0: camera.position.length(), d1, start: performance.now() }
  }
  // The view's narrower half-angle, with a margin so the shape doesn't touch the box's edge.
  const tanHalf = () => 0.8 * Math.tan(((camera.fov / 2) * Math.PI) / 180) * Math.min(1, camera.aspect)

  let frame = 0
  const loop = (now: number) => {
    const animating = aim !== null
    if (aim) {
      const t = Math.min(1, (now - aim.start) / 800)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const d = aim.d0 + (aim.d1 - aim.d0) * e
      camera.position.copy(aim.dir).applyQuaternion(new THREE.Quaternion().slerp(aim.turn, e)).multiplyScalar(d)
      camera.lookAt(0, 0, 0)
      if (t === 1) aim = null
    }
    const moved = controls.update() // true while dragging, zooming or easing to a stop
    if (animating || moved || dirty) {
      // Up close: slower dragging, and dashes that shrink with the view so outlines stay readable.
      const k = (camera.position.length() - 1) / (FAR - 1)
      controls.rotateSpeed = Math.max(0.05, 0.5 * k)
      dashed.dashSize = Math.max(0.0015, 0.018 * k)
      dashed.gapSize = Math.max(0.001, 0.012 * k)
      pin.scale.setScalar(Math.max(0.04, k)) // the same size on screen at any zoom
      renderer.render(scene, camera)
      dirty = false
    }
    frame = requestAnimationFrame(loop)
  }
  frame = requestAnimationFrame(loop)

  // A click (not a drag) on the globe picks the point under it.
  const raycaster = new THREE.Raycaster()
  let down = { x: 0, y: 0 }
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
  const onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
    const rect = renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObject(earth)[0]
    if (hit) {
      const { lat, lon } = toLatLon(hit.point.x, hit.point.y, hit.point.z)
      onPick(lat, lon)
    }
  }
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointerup', onUp)

  const resize = new ResizeObserver(() => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    dirty = true
  })
  resize.observe(host)

  // What is already built, so typing a point (which only moves the pin) rebuilds no outlines.
  let built: { regions?: Region[]; shapes?: RegionShapes } = {}
  let painted = ''

  return {
    update({ regions, shapes, highlight, pin: p }) {
      dirty = true
      if (regions !== built.regions || shapes !== built.shapes) {
        built = { regions, shapes }
        painted = ''
        outlines.children.forEach((c) => (c as InstanceType<typeof THREE.Line>).geometry.dispose())
        outlines.clear()
        for (const r of regions) {
          for (const ring of ringsOf(r, shapes)) {
            const points = densify(ring).map(([lon, lat]) => new THREE.Vector3(...toVector(lat, lon, 1.004)))
            const geometry = new THREE.BufferGeometry().setFromPoints(points)
            const line = new THREE.Line(geometry, dashed)
            line.computeLineDistances()
            line.renderOrder = 1 // after the navy line at the same depth, so the dashes sit on top
            outlines.add(new THREE.Line(geometry.clone(), under), line)
          }
        }
      }

      const chosen = regions.find((r) => r.id === highlight)
      if ((highlight ?? '') !== painted) {
        painted = highlight ?? ''
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        edge.children.forEach((c) => (c as InstanceType<typeof THREE.Line>).geometry.dispose())
        edge.clear()
        if (chosen) {
          for (const ring of ringsOf(chosen, shapes)) {
            const points = densify(ring).map(([lon, lat]) => new THREE.Vector3(...toVector(lat, lon, 1.005)))
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), edgeMat)
            line.renderOrder = 2
            edge.add(line)
          }
          ctx.beginPath()
          for (const ring of ringsOf(chosen, shapes)) {
            ring.forEach(([lon, lat], i) => {
              const x = ((lon + 180) / 360) * canvas.width
              const y = ((90 - lat) / 180) * canvas.height
              if (i) ctx.lineTo(x, y)
              else ctx.moveTo(x, y)
            })
            ctx.closePath()
          }
          ctx.fillStyle = 'rgba(228, 55, 0, 0.45)'
          ctx.fill('evenodd')
        }
        overlayTex.needsUpdate = true
      }

      pin.visible = !!p
      if (p) {
        const normal = new THREE.Vector3(...toVector(p.lat, p.lon))
        pin.position.copy(normal)
        pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
      }

      // Centre the pin (or the region) and zoom so the whole region shape fits; a lone pin gets a fixed close view.
      const key = `${highlight ?? ''}|${p ? `${p.lat},${p.lon}` : ''}|${shapes ? 1 : 0}`
      if ((p || chosen) && key !== aimedAt) {
        const view = chosen ? fitView(ringsOf(chosen, shapes), tanHalf(), p) : { ...p!, distance: PIN_DISTANCE }
        moveTo(view.lat, view.lon, Math.max(FIT_NEAR, view.distance))
      }
      aimedAt = key
    },
    zoom(factor) {
      const { lat, lon } = toLatLon(camera.position.x, camera.position.y, camera.position.z)
      moveTo(lat, lon, camera.position.length() * factor)
    },
    dispose() {
      cancelAnimationFrame(frame)
      resize.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      scene.traverse((o) => {
        const m = o as InstanceType<typeof THREE.Mesh>
        m.geometry?.dispose()
        const mat = m.material as InstanceType<typeof THREE.MeshBasicMaterial> | undefined
        mat?.map?.dispose()
        mat?.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

export function WorldMap({ regions, highlight, pin, label, onRegion }: WorldMapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const globe = useRef<Globe | undefined>(undefined)
  const latest = useRef({ regions, onRegion })
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(() => !hasWebGL())
  const [shapes, setShapes] = useState<RegionShapes>()

  useEffect(() => {
    latest.current = { regions, onRegion }
  }, [regions, onRegion])

  useEffect(() => {
    let live = true
    loadRegionShapes().then(
      (s) => live && setShapes(s),
      () => {}, // without outlines each region's box is drawn instead
    )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (failed || !ref.current) return
    let live = true
    let made: Globe | undefined
    makeGlobe(ref.current, (lat, lon) => {
      const r = regionAt(lat, lon, latest.current.regions)
      if (r) latest.current.onRegion?.(r.id)
    }).then(
      (g) => {
        if (!live) return g.dispose()
        made = g
        globe.current = g
        setReady(true)
      },
      () => live && setFailed(true),
    )
    return () => {
      live = false
      made?.dispose()
      globe.current = undefined
    }
  }, [failed])

  useEffect(() => {
    if (ready) globe.current?.update({ regions, shapes, highlight, pin })
  }, [ready, regions, shapes, highlight, pin])

  return (
    <figure className="world-map">
      {failed ? (
        <>
          <div role="img" aria-label={label} />
          <figcaption className="notice">This browser can't draw the 3D globe. Pick a region from the list, or type coordinates.</figcaption>
        </>
      ) : (
        <>
          <div className="world-map-stage">
            <div ref={ref} className="world-map-globe" role="img" aria-label={label} />
            <div className="zoom-buttons">
              <button type="button" aria-label="Zoom in" disabled={!ready} onClick={() => globe.current?.zoom(0.7)}>
                +
              </button>
              <button type="button" aria-label="Zoom out" disabled={!ready} onClick={() => globe.current?.zoom(1 / 0.7)}>
                −
              </button>
            </div>
          </div>
          <figcaption className="map-hint">
            Drag to turn the globe, scroll or pinch to zoom. Click inside a dashed outline to pick that region.
          </figcaption>
        </>
      )}
    </figure>
  )
}
