import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CardCarousel({ children, count, threshold = 3, dark = true }) {
  const ref = useRef(null)
  const scroll = dir => ref.current?.scrollBy({ left: dir * ref.current.offsetWidth, behavior: 'smooth' })
  const showArrows = count > threshold

  const btn = dark
    ? 'bg-[#1b212e] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
    : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-400'

  return (
    <div className={`relative ${showArrows ? 'px-5' : ''}`}>
      {showArrows && (
        <button onClick={() => scroll(-1)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center border rounded-full transition-colors shadow-md ${btn}`}>
          <ChevronLeft size={16} />
        </button>
      )}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {showArrows && (
        <button onClick={() => scroll(1)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center border rounded-full transition-colors shadow-md ${btn}`}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
