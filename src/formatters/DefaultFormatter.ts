import { Formatter } from "../Types"


export const DefaultFormatter: Formatter = typeof window === "undefined" ?
  new (require("./PatternFormatter").PatternFormatter)() :
  new (require("./ConsoleFormatter").ConsoleFormatter)()
