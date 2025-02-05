/**
 * Embed Tool for the Editor.js
 *
 * @author CodeX <team@codex.so>
 * @license MIT
 * @see {@link https://github.com/editor-js/image}
 *
 * To developers.
 * To simplify Tool structure, we split it to 4 parts:
 *  1) index.js — main Tool's interface, public API and methods for working with data
 *  2) uploader.js — module that has methods for sending files via AJAX: from media gallery component
 *  3) ui.js — module for UI manipulations: render, showing preloader, etc
 *  4) tunes.js — working with Block Tunes: render buttons, handle clicks
 *
 * For debug purposes there is a testing server
 * that can save uploaded files and return a Response {@link UploadResponseFormat}
 *
 *       $ node dev/server.js
 *
 * It will expose 8008 port, so you can pass http://localhost:8008 with the Tools config:
 *
 * embed: {
 *   class: EmbedTool,
 *   config: {
 *     selectFiles: () => { }
 *   },
 * },
 */

/**
 * @typedef {object} EmbedToolData
 * @description Embed Tool's input and output data format
 * @property {string} caption — Embed caption
 * @property {object} file — Embed file data returned from backend
 * @property {string} file.url — Embed URL
 */

import './index.css';

import Ui from './ui';
import Uploader from './uploader';

/**
 * @typedef {object} EmbedConfig
 * @description Config supported by Tool
 * @property {object} endpoints - upload endpoints
 * @property {string} endpoints.byFile - upload by file
 * @property {string} endpoints.byUrl - upload by URL
 * @property {string} field - field name for uploaded embed
 * @property {string} types - available mime-types
 * @property {string} captionPlaceholder - placeholder for Caption field
 * @property {object} additionalRequestData - any data to send with requests
 * @property {object} additionalRequestHeaders - allows to pass custom headers with Request
 * @property {string} buttonContent - overrides for Select File button
 * @property {object} [uploader] - optional custom uploader
 * @property {function(): Promise.<UploadResponseFormat>} selectFiles - method that selects an embed file from a custom file/ asset manager
 */

/**
 * @typedef {object} UploadResponseFormat
 * @description This format expected from backend on file uploading
 * @property {number} success - 1 for successful uploading, 0 for failure
 * @property {object} file - Object with file data.
 *                           'url' is required,
 *                           also can contain any additional data that will be saved and passed back
 * @property {string} file.url - [Required] embed source URL
 */
export default class EmbedTool {
  /**
   * Notify core that read-only mode is supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @returns {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      title: 'Embed',
      icon: `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 3.125V6.25a.625.625 0 1 1-1.25 0v-2.5h-2.5a.625.625 0 1 1 0-1.25h3.125c.345 0 .625.28.625.625ZM6.25 16.25h-2.5v-2.5a.625.625 0 1 0-1.25 0v3.125c0 .345.28.625.625.625H6.25a.625.625 0 1 0 0-1.25Zm10.625-3.125a.625.625 0 0 0-.625.625v2.5h-2.5a.625.625 0 1 0 0 1.25h3.125c.345 0 .625-.28.625-.625V13.75a.625.625 0 0 0-.625-.625Zm-13.75-6.25c.345 0 .625-.28.625-.625v-2.5h2.5a.625.625 0 1 0 0-1.25H3.125a.625.625 0 0 0-.625.625V6.25c0 .345.28.625.625.625Zm2.5-.625v7.5c0 .345.28.625.625.625h7.5c.345 0 .625-.28.625-.625v-7.5a.625.625 0 0 0-.625-.625h-7.5a.625.625 0 0 0-.625.625Z" fill="#5C6B7A" fill-rule="nonzero"/></svg>`,
    };
  }

  /**
   * Available embed tools
   *
   * @returns {Array}
   */
  static get tunes() {
    return [
      {
        name: 'stretched',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 641 640"><path fill="#5C6B7A" fill-rule="nonzero" d="M1 160h640v320H1V160Zm120-80h400v20H121V80Zm0 460h400v20H121v-20Z"/></svg>`,
        title: 'Stretch embed',
        toggle: true,
      },
      {
        name: 'withBackground',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 641 640"><path fill="#5C6B7A" fill-rule="nonzero" d="M181 200h280v240H181V200ZM81 120h480v20H81v-20Zm0 380h480v20H81v-20Z"/></svg>`,
        title: 'With background',
        toggle: true,
      },
      {
        name: 'withBorder',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 641 640"><rect width="512" height="409" x="64" y="115" fill="none" fill-rule="evenodd" stroke="#5C6B7A" stroke-linecap="round" stroke-width="34" rx="40"/></svg>`,
        title: 'With border',
        toggle: true,
      },
    ];
  }

  /**
   * @param {object} tool - tool properties got from editor.js
   * @param {EmbedToolData} tool.data - previously saved data
   * @param {EmbedConfig} tool.config - user config for Tool
   * @param {object} tool.api - Editor.js API
   * @param {boolean} tool.readOnly - read-only mode flag
   */
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;

    /**
     * Tool's initial config
     */
    this.config = {
      endpoints: config.endpoints || '',
      additionalRequestData: config.additionalRequestData || {},
      additionalRequestHeaders: config.additionalRequestHeaders || {},
      field: config.field || 'embed',
      types: config.types || 'embed/*',
      captionPlaceholder: this.api.i18n.t(config.captionPlaceholder || 'Caption'),
      buttonContent: config.buttonContent || '',
      uploader: config.uploader || undefined,
      actions: config.actions || [],
      selectFiles: config.selectFiles || undefined,
    };

    /**
     * Module for file uploading
     */
    this.uploader = new Uploader({
      config: this.config
    });

    /**
     * Module for working with UI
     */
    this.ui = new Ui({
      api,
      config: this.config,
      onSelectFile: () => {
        this.uploader.uploadSelectedFile({
          onPreview: (src) => {
            this.ui.showPreloader(src);
          },
        });
      },
      readOnly,
    });

    /**
     * Set saved state
     */
    this._data = {};
    this.data = data;
  }

  /**
   * Renders Block content
   *
   * @public
   *
   * @returns {HTMLDivElement}
   */
  render() {
    return this.ui.render(this.data);
  }

  /**
   * Validate data: check if sound file exists
   *
   * @param {EmbedToolData} savedData — data received after saving
   * @returns {boolean} false if saved data is not correct, otherwise true
   * @public
   */
  validate(savedData) {
    return savedData.file && savedData.file.url;
  }

  /**
   * Return Block data
   *
   * @public
   *
   * @returns {EmbedToolData}
   */
  save() {
    const caption = this.ui.nodes.caption;

    this._data.caption = caption.innerHTML;

    return this.data;
  }

  /**
   * Returns configuration for block tunes: add background, stretch embed player
   *
   * @public
   *
   * @returns {Array}
   */
  renderSettings() {
    // Merge default tunes with the ones that might be added by user
    // @see https://github.com/editor-js/image/pull/49
    const tunes = EmbedTool.tunes.concat(this.config.actions);

    return tunes.map(tune => ({
      icon: tune.icon,
      label: this.api.i18n.t(tune.title),
      name: tune.name,
      toggle: tune.toggle,
      isActive: this.data[tune.name],
      onActivate: () => {
        /* If it'a user defined tune, execute it's callback stored in action property */
        if (typeof tune.action === 'function') {
          tune.action(tune.name);

          return;
        }
        this.tuneToggled(tune.name);
      },
    }));
  }

  /**
   * Fires after clicks on the Toolbox Embed Icon
   * Initiates click on the Select File button
   *
   * @public
   */
  appendCallback() {
    this.ui.nodes.fileButton.click();
  }

  /**
   * Private methods
   * ̿̿ ̿̿ ̿̿ ̿'̿'\̵͇̿̿\з= ( ▀ ͜͞ʖ▀) =ε/̵͇̿̿/’̿’̿ ̿ ̿̿ ̿̿ ̿̿
   */

  /**
   * Stores all Tool's data
   *
   * @private
   *
   * @param {EmbedToolData} data - data in Embed Tool format
   */
  set data(data) {
    this.embed = data.file;

    this._data.caption = data.caption || '';
    this.ui.fillCaption(this._data.caption);

    EmbedTool.tunes.forEach(({ name: tune }) => {
      const value = typeof data[tune] !== 'undefined' ? data[tune] === true || data[tune] === 'true' : false;

      this.setTune(tune, value);
    });
  }

  /**
   * Return Tool data
   *
   * @private
   *
   * @returns {EmbedToolData}
   */
  get data() {
    return this._data;
  }

  /**
   * Set new embed file
   *
   * @private
   *
   * @param {object} file - uploaded file data
   */
  set embed(file) {
    this._data.file = file || {};
    if (file && file.url) {
      // console.log('file', JSON.stringify(file));
      this.ui.fillEmbed(file);
    }
  }

  /**
   * Callback fired when Block Tune is activated
   *
   * @private
   *
   * @param {string} tuneName - tune that has been clicked
   * @returns {void}
   */
  tuneToggled(tuneName) {
    // inverse tune state
    this.setTune(tuneName, !this._data[tuneName]);
  }

  /**
   * Set one tune
   *
   * @param {string} tuneName - {@link Tunes.tunes}
   * @param {boolean} value - tune state
   * @returns {void}
   */
  setTune(tuneName, value) {
    this._data[tuneName] = value;

    this.ui.applyTune(tuneName, value);

    if (tuneName === 'stretched') {
      /**
       * Wait until the API is ready
       */
      Promise.resolve().then(() => {
        const blockId = this.api.blocks.getCurrentBlockIndex();

        this.api.blocks.stretchBlock(blockId, value);
      })
        .catch(err => {
          console.error(err);
        });
    }
  }
}
