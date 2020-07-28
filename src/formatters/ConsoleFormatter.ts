import {
  LogConfig,
  Formatter,
  Entry,
  Nullable,
  StackData,
  AppenderTemplateFn
} from "../Types"
import * as moment from "moment"
import * as chalk from "chalk"
import {
  defaultsDeep,
  memoize,
  isEmpty,
  isError,
  get,
  defaultTo,
  flatMap,
  flatten
} from "lodash"
import { inspect } from "util"
import { buildString, getThresholdValue } from "../util/CoreUtil"
import { Option } from "@3fv/prelude-ts"
import { Run } from "../util/FpTools"
import { isFunction, isString } from "@3fv/guard"
import { Level, LevelName } from "@3fv/logger-proxy"

const DefaultCategoryName = "ROOT"

export type ConsoleFormatterTemplateArgs = Omit<Entry, "timestamp"> & {
  timestampFormatted: string
  showCategory: boolean
  showTimestamp: boolean
  showError: boolean
  showLoggerName: boolean
  showStackDataAlways: boolean
  formatArgs: boolean
  errors: Nullable<Error[]>
}

export type ConsoleTemplateData = AppenderTemplateFn<
  ConsoleFormatterTemplateArgs
>

export interface ConsoleFormatterConfig {
  timestampFormat: string
  template: (data: ConsoleTemplateData) => string
  formatArgs: boolean
  showStackDataAlways: boolean
  showCategory: boolean
  showLoggerName: boolean
  showTimestamp: boolean
  showError: boolean
}

export const defaultConsoleFormatterConfig: ConsoleFormatterConfig = {
  timestampFormat: "HH:mm:ss",
  showCategory: true,
  showLoggerName: true,
  showTimestamp: true,
  showStackDataAlways: false,
  showError: true,
  formatArgs: false,
  //logFn(`${globalPrefix || ""}[${name}] [${level.toUpperCase()}] ${textMsg}`, ...args)
  template: (data) => {
    const {
        timestampFormatted,
        level,
        message,
        args,
        stackData,
        showLoggerName,
        showCategory,
        showTimestamp,
        showError,
        formatArgs,
        showStackDataAlways,
        logger: { basename: loggerName },
        category,
        errors
      } = data,
      stackDataPath = Option.ofNullable(stackData)
        .map(({ path }: StackData) =>
          Option.of(path.indexOf("file:"))
            .filter((index) => index > -1)
            .map((index) => path.substr(index + 5, path.length))
            .getOrUndefined()
        )
        .getOrUndefined(),
      categoryName = Option.ofNullable(category.name).match({
        Some: (it) => it,
        None: () =>
          !stackDataPath
            ? DefaultCategoryName
            : Option.of(stackDataPath.split("/"))
                .map((parts) =>
                  parts.length < 3
                    ? stackDataPath
                    : parts[parts.length - 3].replace(/\.[a-zA-Z0-9]+$/, "")
                )
                .get()
      }),
      name =
        showCategory || showLoggerName
          ? `(${buildString(
              [
                showCategory && defaultTo(categoryName, DefaultCategoryName),
                showLoggerName && loggerName
              ]
                .filter(isString)
                .filter((part, index, parts) => part != parts[index + 1]),
              ":"
            )})`
          : ""

    return buildString(
      [
        // TIMESTAMP
        showTimestamp ? timestampFormatted : "",

        // LEVEL
        `[${level.toUpperCase()}]`,

        // CATEGORY/LOGGER
        name,

        // STACK DATA
        (showStackDataAlways ||
          getThresholdValue(level) >= getThresholdValue(Level.warn)) &&
          buildString(
            [
              Option.ofNullable(stackData)
                .map((stackDataOrFn) =>
                  isFunction(stackDataOrFn)
                    ? stackDataOrFn(data)
                    : stackDataOrFn
                )
                .map((stackData) => [
                  `${stackDataPath}:${stackData.line}:${stackData.pos}`,
                  isEmpty(stackData.method) ? "" : ` ${stackData.method}`
                ])
                .getOrElse([])
            ],
            ""
          ),

        // MESSAGE
        message,

        // ARGS
        // ARGS
        flatten(
          !formatArgs
            ? []
            : Array.isArray(args)
            ? args.map((arg) => inspect(arg)).join(" ")
            : ""
        ),

        // ERROR
        buildString(
          showError && !!errors && errors.length > 0
            ? flatMap(errors, (error) => [
                "\n",
                error.message,
                "\n",
                error.stack
              ])
            : [],
          ""
        )
      ].filter(isString),
      " "
    )
  }
}

export class ConsoleFormatter implements Formatter<ConsoleFormatterConfig> {
  readonly config: ConsoleFormatterConfig

  constructor(config: Partial<ConsoleFormatterConfig> = {}) {
    this.config = defaultsDeep(config, defaultConsoleFormatterConfig)
  }

  setConfig(newConfig: Partial<ConsoleFormatterConfig>): this {
    Object.assign(
      this.config,
      defaultsDeep(newConfig, defaultConsoleFormatterConfig)
    )
    return this
  }

  format(entry: Entry, config: LogConfig): [string, Array<any>] {
    const { config: formatterConfig } = this,
      {
        template,
        showError,
        showStackDataAlways,
        showLoggerName,
        timestampFormat,
        formatArgs,
        showCategory,
        showTimestamp
      } = formatterConfig,
      timestampFormatted = moment(entry.timestamp).format(timestampFormat)

    let { level, args } = entry

    const [errors, argsWithoutErrors] = Option.of(args.filter(isError))
      .filter((errors) => errors.length > 0)
      .match({
        None: () => [[], args],
        Some: (errors) => [errors, args.filter((it) => errors.includes(it))]
      }) as [Array<Error>, any[]]

    const params: ConsoleTemplateData = {
      ...entry,
      level,
      timestampFormatted,
      showLoggerName,
      showTimestamp,
      showCategory,
      formatArgs: formatArgs,
      showError,
      showStackDataAlways,
      args: argsWithoutErrors,
      errors
    }
    let output = template(params)

    return [output, [...argsWithoutErrors, ...errors]]
  }
}
