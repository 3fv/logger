import {  getThresholdValue, passesThreshold, pathToBasename } from "./util/CoreUtil"
import { Category, LogConfig, Entry, LogFactory, Nullable, StackDataProvider, LogStackConfig } from "./Types"
import { Option } from "@3fv/prelude-ts"
import { isNumber, isFunction, isDefined } from "@3fv/guard"

import { Level, Logger } from "@3fv/logger-proxy"

function isStackDataProvider(o: any): o is StackDataProvider {
  return isFunction(o)
}


function log(
  factory: LogFactory,
  logger: Logger,
  category: Category,
  level: Nullable<Level>,
  message: string,
  args: any[]
) {
  if (!passesThreshold(factory.getRootLevel(), level)) {
    return
  }
  
  const
    config:LogConfig = factory.getConfig(),
    { stack: stackConfig } = config,
    { config: categoryConfig } = category,
    { appenderIds } = categoryConfig,
    appenders = config.appenders.filter(it => !appenderIds || appenderIds.includes(it.id))
  
  if (!!appenders.length) {
    Option
      .of({
        timestamp: Date.now(),
        level,
        overrideThreshold: undefined,
        category,
        logger,
        message,
        args,
        stackData: entry => Option.of(stackConfig)
          .filter(({ enabled, provider }) => !!enabled && isStackDataProvider(provider))
          .map(({ provider }:LogStackConfig) =>
            (
              provider as StackDataProvider
            )(entry, config)
          )
          .getOrNull()
      } as Entry)
      .map(entry =>
        appenders.forEach(appender => {
          appender.append(entry, config)
        }))
  }
}

export function makeLogger(factory: LogFactory, path: string, categoryName: string): Logger {
  
  const
    [traceThreshold, debugThreshold, infoThreshold] = [Level.trace, Level.debug, Level.info]
      .map(getThresholdValue),
    rootLevel = () => factory.getConfig().rootLevel
  
  return Option.of(factory.getCategory(categoryName))
    .map(category => {
      let overrideThreshold: Nullable<number> = undefined
      const logger = {} as Logger
      Object.defineProperties(
        Object.assign(logger, {
          category,
          basename: pathToBasename(path),
          path,
          setOverrideThreshold: (level: Level | number) => {
            overrideThreshold = isNumber(level) ? level : getThresholdValue(level)
            return logger
          },
          isTraceEnabled: () =>
            [overrideThreshold, getThresholdValue(rootLevel())]
              .filter(isDefined)
              .some(level => level >= traceThreshold),
          isDebugEnabled: () =>
            [overrideThreshold, getThresholdValue(rootLevel())]
              .filter(isDefined)
              .some(level => level >= debugThreshold),
          isInfoEnabled: () =>
            [overrideThreshold, getThresholdValue(rootLevel())]
              .filter(isDefined)
              .some(level => level >= infoThreshold)
          
        }) as Logger,
        {
          overrideThreshold: {
            configurable: false,
            get(): any {
              return overrideThreshold
            }
          }
        }
      )
      return Object
        .values(Level)
        .reduce((logger, level) =>
            Object
              .assign(logger, {
                [level]: (message: string, ...args: any[]) => {
                  log(factory, logger, category, level, message, args)
                }
              })
          , logger)
    })
    .getOrThrow()
}


