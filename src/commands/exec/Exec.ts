import * as utils from '../../utils';
import * as verify from '../../verify';
import Action from '../../models/Action';
import Microservice from '../../models/Microservice';

/**
 * Used to represent a way to execute a {@link Microservice}'s {@link Action}s.
 */
export default abstract class Exec {
  protected dockerImage: string;
  protected microservice: Microservice;
  protected _arguments: any;
  protected environmentVariables: any;
  protected dockerServiceId: string;
  protected action: Action;

  /**
   * Use to help build a {@link FormatExec}, {@link HttpExec}, or an {@link EventExec}.
   *
   * @param {String} dockerImage The given docker image
   * @param {Microservice} microservice The given {@link Microservice}
   * @param {Object} _arguments The argument map
   * @param {Object} environmentVariables The environment map
   */
  protected constructor(dockerImage: string, microservice: Microservice, _arguments: any, environmentVariables: any) {
    this.dockerImage = dockerImage;
    this.microservice = microservice;
    this._arguments = _arguments;
    this.environmentVariables = environmentVariables;
    this.dockerServiceId = null;
    this.action = null;
  }

  /**
   * Checks if required arguments and environment variables are given and will also set their default values.
   *
   * @param {Object} spinner The spinner for the {@link Exec}
   */
  protected preChecks(spinner: any) {
    this.setDefaultArguments();
    this.setDefaultEnvironmentVariables();
    if (!this.action.areRequiredArgumentsSupplied(this._arguments)) {
      throw {
        spinner,
        message: `Failed action: \`${this.action.name}\`. Need to supply required arguments: \`${this.action.requiredArguments.toString()}\``,
      };
    }
    if (!this.microservice.areRequiredEnvironmentVariablesSupplied(this.environmentVariables)) {
      throw {
        spinner,
        message: `Failed action: \`${this.action.name}\`. Need to supply required environment variables: \`${this.microservice.requiredEnvironmentVariables.toString()}\``,
      };
    }
  }

  /**
   * Runs verification on arguments and environment variables.
   */
  protected verification() {
    verify.verifyArgumentTypes(this.action, this._arguments);
    this.castTypes();
    verify.verifyArgumentConstrains(this.action, this._arguments);

    verify.verifyEnvironmentVariableTypes(this.microservice, this.environmentVariables);
    verify.verifyEnvironmentVariablePattern(this.microservice, this.environmentVariables);
  }

  /**
   * Sets a {@link Action}'s default arguments.
   */
  private setDefaultArguments(): void {
    for (let i = 0; i < this.action.arguments.length; i += 1) {
      const argument = this.action.arguments[i];
      if (!this._arguments[argument.name]) {
        if (argument.default !== null) {
          if (typeof argument.default === 'object') {
            this._arguments[argument.name] = JSON.stringify(argument.default);
          } else {
            this._arguments[argument.name] = argument.default + '';
          }
        }
      }
    }
  }

  /**
   * Sets a {@link Microservice}'s default {@link EnvironmentVariable}s and variables from the system environment variables.
   */
  private setDefaultEnvironmentVariables(): void {
    for (let i = 0; i < this.microservice.environmentVariables.length; i += 1) {
      const environmentVariable = this.microservice.environmentVariables[i];
      if (!this.environmentVariables[environmentVariable.name]) {
        if (environmentVariable.default !== null) {
          this.environmentVariables[environmentVariable.name] = environmentVariable.default;
        }
      }
    }

    for (let i = 0; i < this.microservice.environmentVariables.length; i += 1) {
      const environmentVariable = this.microservice.environmentVariables[i];
      if (process.env[environmentVariable.name]) {
        this.environmentVariables[environmentVariable.name] = process.env[environmentVariable.name];
      }
    }
  }

  /**
   * Cast the types of the arguments. Everything comes in as a string so it's important to convert to given type.
   */
  protected castTypes(): void {
    const argumentList = Object.keys(this._arguments);
    for (let i = 0; i < argumentList.length; i += 1) {
      const argument = this.action.getArgument(argumentList[i]);
      this._arguments[argument.name] = utils.typeCast[argument.type](this._arguments[argument.name]);
    }
  }

  /**
   * Formats an object of environment variables to a `-e KEY='val'` style.
   *
   * @return {String} The formatted string
   */
  protected formatEnvironmentVariables(): string {
    let result = '';
    const keys = Object.keys(this.environmentVariables);
    for (let i = 0; i < keys.length; i += 1) {
      result += ` -e ${keys[i]}="${this.environmentVariables[keys[i]]}"`;
    }
    return result;
  }

  /**
   * Checks it a Docker process is running.
   *
   * @return {Boolean} True if a Docker process is running, otherwise false
   */
  public isDockerProcessRunning(): boolean {
    return false;
  }

  /**
   * Stops a running Docker service.
   */
  public async serverKill(): Promise<void> {}

  /**
   * Executes the given {@link Action}.
   *
   * @param {String} action
   */
  public abstract async exec(action: string): Promise<void>;
}
