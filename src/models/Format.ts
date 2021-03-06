const validateFormat = require('../schema/schema').format;

/**
 * Describes a format.
 */
export default class Format {
  private readonly _command: any;

  /**
   * Builds a {@link Format}.
   *
   * @param {String} commandName The given command name
   * @param {Object} rawFormat The given raw data
   */
  constructor(commandName: string, rawFormat: any) {
    const isValid = validateFormat(rawFormat);
    if (!isValid.valid) {
      isValid.text = isValid.text.replace(/data/g, `commands.${commandName}.format`);
      throw isValid;
    }
    if (typeof rawFormat.command === 'string') {
      this._command = rawFormat.command;
    } else {
      this._command = '';
      for (let i = 0; i < rawFormat.command.length; i += 1) {
        this._command += rawFormat.command[i] + ' ';
      }
      this._command = this._command.trim();
    }
  }

  /**
   * Gets the command for this {@link Format}.
   *
   * @return {String} The command for this {@link Format}
   */
  public get command(): string {
    return this._command;
  }
}
