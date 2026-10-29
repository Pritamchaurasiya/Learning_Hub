import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Delete, Calculator as CalcIcon } from 'lucide-react'

export interface ExamScientificCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ExamScientificCalculatorModal = memo(function ExamScientificCalculatorModal({
  isOpen,
  onClose,
}: ExamScientificCalculatorModalProps) {
  const [display, setDisplay] = useState('0')
  const [memory, setMemory] = useState(0)
  const [isRad, setIsRad] = useState(false)
  const [history, setHistory] = useState('')
  const [prevVal, setPrevVal] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [overwrite, setOverwrite] = useState(true)

  const handleDigit = useCallback(
    (digit: string) => {
      if (overwrite) {
        setDisplay(digit)
        setOverwrite(false)
      } else {
        setDisplay(prev => (prev === '0' ? digit : prev + digit))
      }
    },
    [overwrite]
  )

  const handleDecimal = useCallback(() => {
    if (overwrite) {
      setDisplay('0.')
      setOverwrite(false)
    } else if (!display.includes('.')) {
      setDisplay(prev => prev + '.')
    }
  }, [display, overwrite])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setOverwrite(true)
  }, [])

  const handleAllClear = useCallback(() => {
    setDisplay('0')
    setHistory('')
    setPrevVal(null)
    setOp(null)
    setOverwrite(true)
  }, [])

  const handleBackspace = useCallback(() => {
    if (overwrite) return
    setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'))
  }, [overwrite])

  const calculate = useCallback(
    (a: number, b: number, operator: string): number => {
      switch (operator) {
        case '+':
          return a + b
        case '-':
          return a - b
        case '×':
        case '*':
          return a * b
        case '÷':
        case '/':
          return b !== 0 ? a / b : NaN
        case 'x^y':
          return Math.pow(a, b)
        case 'mod':
          return a % b
        default:
          return b
      }
    },
    []
  )

  const handleOperator = useCallback(
    (operator: string) => {
      const current = parseFloat(display)
      if (prevVal === null) {
        setPrevVal(current)
        setOp(operator)
        setHistory(`${current} ${operator}`)
        setOverwrite(true)
      } else if (op) {
        const result = calculate(prevVal, current, op)
        setPrevVal(result)
        setDisplay(String(Number(result.toFixed(8))))
        setOp(operator)
        setHistory(`${Number(result.toFixed(8))} ${operator}`)
        setOverwrite(true)
      }
    },
    [calculate, display, op, prevVal]
  )

  const handleEquals = useCallback(() => {
    if (prevVal !== null && op) {
      const current = parseFloat(display)
      const result = calculate(prevVal, current, op)
      setHistory(`${prevVal} ${op} ${current} =`)
      setDisplay(String(Number(result.toFixed(8))))
      setPrevVal(null)
      setOp(null)
      setOverwrite(true)
    }
  }, [calculate, display, op, prevVal])

  const handleSciFunc = useCallback(
    (fn: string) => {
      const val = parseFloat(display)
      let res = 0
      const toRad = (deg: number) => (deg * Math.PI) / 180
      const toDeg = (rad: number) => (rad * 180) / Math.PI

      switch (fn) {
        case 'sin':
          res = Math.sin(isRad ? val : toRad(val))
          break
        case 'cos':
          res = Math.cos(isRad ? val : toRad(val))
          break
        case 'tan':
          res = Math.tan(isRad ? val : toRad(val))
          break
        case 'asin':
          res = isRad ? Math.asin(val) : toDeg(Math.asin(val))
          break
        case 'acos':
          res = isRad ? Math.acos(val) : toDeg(Math.acos(val))
          break
        case 'atan':
          res = isRad ? Math.atan(val) : toDeg(Math.atan(val))
          break
        case 'ln':
          res = val > 0 ? Math.log(val) : NaN
          break
        case 'log10':
          res = val > 0 ? Math.log10(val) : NaN
          break
        case 'sqrt':
          res = val >= 0 ? Math.sqrt(val) : NaN
          break
        case 'cbrt':
          res = Math.cbrt(val)
          break
        case 'sqr':
          res = val * val
          break
        case 'cube':
          res = val * val * val
          break
        case 'recip':
          res = val !== 0 ? 1 / val : NaN
          break
        case 'exp':
          res = Math.exp(val)
          break
        case 'fact': {
          if (val < 0 || !Number.isInteger(val)) {
            res = NaN
          } else {
            let f = 1
            for (let i = 2; i <= val; i++) f *= i
            res = f
          }
          break
        }
        case 'neg':
          res = -val
          break
        case 'pi':
          res = Math.PI
          break
        case 'e':
          res = Math.E
          break
      }

      setHistory(`${fn}(${val})`)
      setDisplay(String(Number(res.toFixed(8))))
      setOverwrite(true)
    },
    [display, isRad]
  )

  // Memory Functions
  const handleMemory = useCallback(
    (action: string) => {
      const val = parseFloat(display)
      switch (action) {
        case 'MC':
          setMemory(0)
          break
        case 'MR':
          setDisplay(String(memory))
          setOverwrite(true)
          break
        case 'MS':
          setMemory(val)
          setOverwrite(true)
          break
        case 'M+':
          setMemory(prev => prev + val)
          setOverwrite(true)
          break
        case 'M-':
          setMemory(prev => prev - val)
          setOverwrite(true)
          break
      }
    },
    [display, memory]
  )

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        handleDigit(e.key)
      } else if (e.key === '.') {
        handleDecimal()
      } else if (e.key === '+') {
        handleOperator('+')
      } else if (e.key === '-') {
        handleOperator('-')
      } else if (e.key === '*') {
        handleOperator('×')
      } else if (e.key === '/') {
        e.preventDefault()
        handleOperator('÷')
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleEquals()
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleDigit, handleDecimal, handleOperator, handleEquals, handleBackspace, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
          role="dialog"
          aria-labelledby="calc-dialog-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400">
                <CalcIcon className="w-4 h-4" />
              </div>
              <span id="calc-dialog-title" className="text-xs font-bold uppercase tracking-wider text-slate-200">
                CBT Virtual Scientific Calculator
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close calculator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Display Surface */}
          <div className="p-4 bg-slate-950/90 border-b border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 min-h-[16px]">
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRad(prev => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isRad ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {isRad ? 'RAD' : 'DEG'}
                </button>
                {memory !== 0 && (
                  <span className="text-amber-400 text-[10px] font-bold">M: {memory}</span>
                )}
              </span>
              <span className="truncate max-w-[200px]">{history}</span>
            </div>
            <div
              data-testid="calc-display"
              className="text-right text-2xl sm:text-3xl font-mono font-bold tracking-tight text-emerald-400 overflow-x-auto select-all"
            >
              {display}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="p-3 bg-slate-900 space-y-1.5 text-xs font-mono">
            {/* Memory & Quick Clear Row */}
            <div className="grid grid-cols-5 gap-1.5">
              {['MC', 'MR', 'MS', 'M+', 'M-'].map(m => (
                <button
                  key={m}
                  onClick={() => handleMemory(m)}
                  className="py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold transition text-[11px]"
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Scientific Functions Rows */}
            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => handleSciFunc('sin')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium transition"
              >
                sin
              </button>
              <button
                onClick={() => handleSciFunc('cos')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium transition"
              >
                cos
              </button>
              <button
                onClick={() => handleSciFunc('tan')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium transition"
              >
                tan
              </button>
              <button
                onClick={() => handleSciFunc('ln')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium transition"
              >
                ln
              </button>
              <button
                onClick={() => handleSciFunc('log10')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium transition"
              >
                log
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => handleSciFunc('asin')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium transition"
              >
                asin
              </button>
              <button
                onClick={() => handleSciFunc('acos')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium transition"
              >
                acos
              </button>
              <button
                onClick={() => handleSciFunc('atan')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-medium transition"
              >
                atan
              </button>
              <button
                onClick={() => handleSciFunc('sqrt')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                √x
              </button>
              <button
                onClick={() => handleOperator('x^y')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                x^y
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => handleSciFunc('sqr')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                x²
              </button>
              <button
                onClick={() => handleSciFunc('cube')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                x³
              </button>
              <button
                onClick={() => handleSciFunc('recip')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                1/x
              </button>
              <button
                onClick={() => handleSciFunc('fact')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                n!
              </button>
              <button
                onClick={() => handleOperator('mod')}
                className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition"
              >
                mod
              </button>
            </div>

            {/* Standard Keypad */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-slate-800">
              <button
                onClick={() => handleSciFunc('pi')}
                className="py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold transition"
              >
                π
              </button>
              <button
                onClick={() => handleDigit('7')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                7
              </button>
              <button
                onClick={() => handleDigit('8')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                8
              </button>
              <button
                onClick={() => handleDigit('9')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                9
              </button>
              <button
                onClick={() => handleOperator('÷')}
                className="py-2.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-sm transition"
              >
                ÷
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => handleSciFunc('e')}
                className="py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold transition"
              >
                e
              </button>
              <button
                onClick={() => handleDigit('4')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                4
              </button>
              <button
                onClick={() => handleDigit('5')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                5
              </button>
              <button
                onClick={() => handleDigit('6')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                6
              </button>
              <button
                onClick={() => handleOperator('×')}
                className="py-2.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-sm transition"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={handleBackspace}
                className="py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold flex items-center justify-center transition"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDigit('1')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                1
              </button>
              <button
                onClick={() => handleDigit('2')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                2
              </button>
              <button
                onClick={() => handleDigit('3')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                3
              </button>
              <button
                onClick={() => handleOperator('-')}
                className="py-2.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-sm transition"
              >
                -
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={handleAllClear}
                className="py-2.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white font-bold transition text-xs"
              >
                AC
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                0
              </button>
              <button
                onClick={handleDecimal}
                className="py-2.5 rounded bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm transition"
              >
                .
              </button>
              <button
                onClick={() => handleSciFunc('neg')}
                className="py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
              >
                ±
              </button>
              <button
                onClick={() => handleOperator('+')}
                className="py-2.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white font-bold text-sm transition"
              >
                +
              </button>
            </div>

            {/* Equals Row */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={handleClear}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Clear Entry (C)
              </button>
              <button
                onClick={handleEquals}
                className="py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition"
              >
                = Evaluate
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
})
