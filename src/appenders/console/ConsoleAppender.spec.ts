import "jest"
import { LogFactory, Logger, Nullable } from "../../Types"
import { configure } from "../../Config"
import { ConsoleAppender } from "../console/ConsoleAppender"
import { Level } from "@3fv/logger-proxy"

let factory: Nullable<LogFactory> = null
let log: Nullable<Logger>  = null


beforeEach(async () => {
  factory = configure()
    .appenders([
      new ConsoleAppender()
    ])
    .rootLevel(Level.trace)
    .getFactory()
  log = factory.getLogger(__filename)
})

test("#console", async () => {
  expect(log).not.toBeNull()
  
  Object.values(Level).forEach(level => {
    log[level].apply(log, [`testing level ${level}`])
  })
})