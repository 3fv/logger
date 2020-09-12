import "jest"
import { LogFactory, Logger, Nullable } from "../../Types"
import { configure } from "../../Config"
import { ConsoleAppender } from "../console/ConsoleAppender"
import { Level } from "@3fv/logger-proxy"
import { isFunction } from "@3fv/guard"
import { assign } from "lodash"

const
  g:any = typeof window === "undefined" ? global : window,
  levels = Object.values(Level)

let
  factory: Nullable<LogFactory> = null,
  log: Nullable<Logger>  = null,
  originalConsole = g.console,
  consoleAppender = new ConsoleAppender()

beforeEach(async () => {
  g.console = levels
    .reduce((newConsole, level) =>
        assign(newConsole, {[level]: jest.fn()})
      , {} as any)
  
  
  factory = configure()
    .appenders([
      consoleAppender
    ])
    .rootLevel(Level.trace)
    .getFactory()
  
  log = factory.getLogger(__filename)
})

afterEach(() => {
  g.console = originalConsole
})

test("#console", async () => {
  expect(log).not.toBeNull()
  
  
  levels
    .forEach(level => {
      log[level].apply(log, [`testing level ${level}`])
      const
        //levelIndex = levels.indexOf(level),
        levelFn = g.console[level]
        //spy = consoleSpies[levelIndex]
      expect(levelFn).toBeCalled()
    })
})
