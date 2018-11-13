import * as fs from 'fs';
import Exec from './Exec';
import Microservice from '../../models/Microservice';
import * as utils from '../../utils';
import ora from '../../ora';
const homedir = require('os').homedir();

/**
 * Represents a execution of an {@link Action}'s {@link Event}.
 */
export default class EventExec extends Exec {
  private portMap: any;

  /**
   * Builds an {@link EventExec}.
   *
   * @param {String} dockerImage The given docker image
   * @param {Microservice} microservice The given {@link Microservice}
   * @param {Object} _arguments The given argument map
   * @param {Object} environmentVariables The given environment map
   */
  constructor(dockerImage: string, microservice: Microservice, _arguments: any, environmentVariables: any) {
    super(dockerImage, microservice, _arguments, environmentVariables);
  }

  /** @inheritdoc */
  async exec(action): Promise<void> {
    await this.startServer();
    this.omgJsonFileHandler();
  }

  /**
   * Starts the server for the HTTP command based off the lifecycle provided in the microservice.yml and builds port mapping.
   */
  private async startServer(): Promise<void> {
    this.portMap = {};
    const spinner = ora.start('Starting Docker container');
    const neededPorts = utils.getNeededPorts(this.microservice);
    const openPorts = [];
    while (neededPorts.length !== openPorts.length) {
      const possiblePort = await utils.getOpenPort();
      if (!openPorts.includes(possiblePort)) {
        openPorts.push(possiblePort);
      }
    }

    let portString = '';
    for (let i = 0; i < neededPorts.length; i += 1) {
      this.portMap[neededPorts[i]] = openPorts[i];
      portString += `-p ${openPorts[i]}:${neededPorts[i]} `;
    }
    portString = portString.trim();

    this.dockerServiceId = await utils.exec(`docker run -d ${portString}${this.formatEnvironmentVariables()} --entrypoint ${this.microservice.lifecycle.startup.command} ${this.dockerImage} ${this.microservice.lifecycle.startup.args}`);
    spinner.succeed(`Stared Docker container with id: ${this.dockerServiceId.substring(0, 12)}`);
  }

  /**
   * Handle the `.omg.json` state file.
   */
  private omgJsonFileHandler(): void {
    let data = {};
    if (fs.existsSync(`${homedir}/.omg.json`)) {
      data = JSON.parse(fs.readFileSync(`${homedir}/.omg.json`).toString());
    }

    data[process.cwd()] = {
      container_id: this.dockerServiceId,
      ports: {},
    };

    const neededPorts = Object.keys(this.portMap);
    for (let i = 0; i < neededPorts.length; i += 1) {
      data[process.cwd()].ports[neededPorts[i]] = this.portMap[neededPorts[i]];
    }
    fs.writeFileSync(`${homedir}/.omg.json`, JSON.stringify(data), 'utf8');
  }
}
