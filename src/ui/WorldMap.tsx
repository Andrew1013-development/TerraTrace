import { useEffect, useRef, useState } from 'react'
import { loadRegionShapes, type RegionShapes } from '../data'
import { regionAt } from '../place'
import type { Region } from '../types'
import { densify, hasWebGL, toLatLon, toVector } from './globe'

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
  dispose: () => void
}

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

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, (host.clientWidth || 600) / (host.clientHeight || 420), 0.1, 100)
  camera.position.set(...toVector(15, 20, 4.3))
  scene.add(new THREE.AmbientLight(0xffffff, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(-1, 1, 2) // follows the camera, so the side facing the user is always lit
  camera.add(sun)
  scene.add(camera)

  // NASA Blue Marble, equirectangular, on the sphere.
  const earthMat = new THREE.MeshLambertMaterial({ color: 0x2f6a9a })
  new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}data/earth.jpg`,
    (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = renderer.capabilities.getMaxAnisotropy()
      earthMat.map = t
      earthMat.color.set(0xffffff)
      earthMat.needsUpdate = true
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
  controls.enableZoom = false // the mouse wheel keeps scrolling the page
  controls.enableDamping = true
  controls.rotateSpeed = 0.5

  // Turning to face a target: a quaternion slerp of the camera around the globe.
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let aim: { from: InstanceType<typeof THREE.Vector3>; turn: InstanceType<typeof THREE.Quaternion>; start: number } | null = null
  let aimedAt = ''
  const face = (lat: number, lon: number) => {
    const to = new THREE.Vector3(...toVector(lat, lon, camera.position.length()))
    if (reduced) return void camera.position.copy(to)
    const from = camera.position.clone()
    aim = { from, turn: new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize()), start: performance.now() }
  }

  let frame = 0
  const loop = (now: number) => {
    if (aim) {
      const t = Math.min(1, (now - aim.start) / 800)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      camera.position.copy(aim.from).applyQuaternion(new THREE.Quaternion().slerp(aim.turn, e))
      camera.lookAt(0, 0, 0)
      if (t === 1) aim = null
    }
    controls.update()
    renderer.render(scene, camera)
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
  })
  resize.observe(host)

  return {
    update({ regions, shapes, highlight, pin: p }) {
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

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const chosen = regions.find((r) => r.id === highlight)
      if (chosen) {
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
        ctx.lineWidth = 5
        ctx.lineJoin = 'round'
        ctx.strokeStyle = '#E8456B'
        ctx.stroke()
      }
      overlayTex.needsUpdate = true

      pin.visible = !!p
      if (p) {
        const normal = new THREE.Vector3(...toVector(p.lat, p.lon))
        pin.position.copy(normal)
        pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
      }

      const target = p ?? (chosen && { lat: (chosen.bbox[0] + chosen.bbox[2]) / 2, lon: (chosen.bbox[1] + chosen.bbox[3]) / 2 })
      const key = target ? `${target.lat},${target.lon}` : ''
      if (target && key !== aimedAt) face(target.lat, target.lon)
      aimedAt = key
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
          <div ref={ref} className="world-map-globe" role="img" aria-label={label} />
          <figcaption className="map-hint">Drag to turn the globe. Click inside a dashed outline to pick that region.</figcaption>
        </>
      )}
    </figure>
  )
}
