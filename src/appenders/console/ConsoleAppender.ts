import { AbstractAppender } from "../AbstractAppender"
import { AppenderConfig, LogConfig, Entry, Nullable } from "../../Types"
import { formatValue } from "../../util/CoreUtil"
import {Option} from "@3fv/prelude-ts"
import { isFunction } from "@3fv/guard"

export interface ConsoleAppenderConfig extends AppenderConfig {

}

export class ConsoleAppender extends AbstractAppender<ConsoleAppenderConfig> {
  
  constructor(config?: Nullable<ConsoleAppenderConfig>) {
    super("console", "console", config || {})
  }
  
  write(entry: Entry, config: LogConfig): void {
    const
      {level} = entry,
      logFn = Option
        .ofNullable(console[level])
        .filter(isFunction)
        .orElse(() => Option.of(console.log))
        .map(logFn => logFn.bind(console))
        .get() as ((...args:any[]) => any),
      [text, args = []] = this.format(entry, config)
    
    logFn.apply(null,[text,...args.map(formatValue)])
    // console.log()
    //process.stdout.write([text,...args.map(formatValue)].join(" ") + "\n")
     //method.apply(console, [text,...args])
  }
  
}
