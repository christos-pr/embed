import { make } from './utils/dom';

/**
 * Class for working with UI:
 *  - rendering base structure
 *  - show/hide preview
 *  - apply tune view
 */
export default class Ui {
  /**
   * @param {object} ui - embed tool Ui module
   * @param {object} ui.api - Editor.js API
   * @param {EmbedConfig} ui.config - user config
   * @param {Function} ui.onSelectFile - callback for clicks on Select file button
   * @param {boolean} ui.readOnly - read-only mode flag
   */
  constructor({ api, config, onSelectFile, readOnly }) {
    this.api = api;
    this.config = config;
    this.onSelectFile = onSelectFile;
    this.readOnly = readOnly;
    this.nodes = {
      wrapper: make('div', [this.CSS.baseClass, this.CSS.wrapper]),
      embedContainer: make('div', [ this.CSS.embedContainer ]),
      fileButton: this.createFileButton(),
      embedElement: undefined,
      // embedElement: make('div', this.CSS.embedElement),
      embedPreloader: make('div', this.CSS.embedPreloader),
      caption: make('div', [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
      }),
    };

    /**
     * Create base structure
     *  <wrapper>
     *    <embed-container>
     *      <embed-preloader />
     *    </embed-container>
     *    <caption />
     *    <select-file-button />
     *  </wrapper>
     */
    this.nodes.caption.dataset.placeholder = this.config.captionPlaceholder;
    this.nodes.embedContainer.appendChild(this.nodes.embedPreloader);
    this.nodes.wrapper.appendChild(this.nodes.embedContainer);
    this.nodes.wrapper.appendChild(this.nodes.caption);
    this.nodes.wrapper.appendChild(this.nodes.fileButton);
  }

  /**
   * CSS classes
   *
   * @returns {object}
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'embed-tool',
      embedContainer: 'embed-tool__embed',
      embedPreloader: 'embed-tool__embed-preloader',
      embedElement: 'embed-tool__embed-element',
      caption: 'embed-tool__caption',
    };
  };

  /**
   * Ui statuses:
   * - empty
   * - uploading
   * - filled
   *
   * @returns {{EMPTY: string, UPLOADING: string, FILLED: string}}
   */
  static get status() {
    return {
      EMPTY: 'empty',
      UPLOADING: 'loading',
      FILLED: 'filled',
    };
  }

  /**
   * Renders tool UI
   *
   * @param {EmbedToolData} toolData - saved tool data
   * @returns {Element}
   */
  render(toolData) {
    if (!toolData.file || Object.keys(toolData.file).length === 0) {
      this.toggleStatus(Ui.status.EMPTY);
    } else {
      this.toggleStatus(Ui.status.UPLOADING);
    }

    return this.nodes.wrapper;
  }

  /**
   * Creates upload-file button
   *
   * @returns {Element}
   */
  createFileButton() {
    const button = make('div', [ this.CSS.button ]);

    button.innerHTML = this.config.buttonContent || `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 3.125V6.25a.625.625 0 1 1-1.25 0v-2.5h-2.5a.625.625 0 1 1 0-1.25h3.125c.345 0 .625.28.625.625ZM6.25 16.25h-2.5v-2.5a.625.625 0 1 0-1.25 0v3.125c0 .345.28.625.625.625H6.25a.625.625 0 1 0 0-1.25Zm10.625-3.125a.625.625 0 0 0-.625.625v2.5h-2.5a.625.625 0 1 0 0 1.25h3.125c.345 0 .625-.28.625-.625V13.75a.625.625 0 0 0-.625-.625Zm-13.75-6.25c.345 0 .625-.28.625-.625v-2.5h2.5a.625.625 0 1 0 0-1.25H3.125a.625.625 0 0 0-.625.625V6.25c0 .345.28.625.625.625Zm2.5-.625v7.5c0 .345.28.625.625.625h7.5c.345 0 .625-.28.625-.625v-7.5a.625.625 0 0 0-.625-.625h-7.5a.625.625 0 0 0-.625.625Z" fill="#5C6B7A" fill-rule="nonzero"/></svg> ${this.api.i18n.t('Click to select an embed...')}`;

    button.addEventListener('click', () => {
      this.onSelectFile();
    });

    return button;
  }

  /**
   * Shows uploading preloader
   *
   * @param {string} src - preview source
   * @returns {void}
   */
  showPreloader(src) {
    this.nodes.embedPreloader.style.backgroundImage = `url(${src})`;

    this.toggleStatus(Ui.status.UPLOADING);
  }

  /**
   * Hide uploading preloader
   *
   * @returns {void}
   */
  hidePreloader() {
    this.nodes.embedPreloader.style.backgroundImage = '';
    this.toggleStatus(Ui.status.EMPTY);
  }

  /**
   * Shows embed
   *
   * @param {object} file - embed source
   * @returns {void}
   */
  fillEmbed(file) {
    const attributes = {
      src: file.thumbnail.url,
      width: file.thumbnail.width,
      height: file.thumbnail.height,
    };

    const eventName = 'load';

    /**
     * Compose tag with defined attributes
     *
     * @type {Element}
     */
    this.nodes.embedElement = make('IMG', this.CSS.embedElement, attributes);
    /**
     * Add load event listener
     */
    this.nodes.embedElement.addEventListener(eventName, () => {
      this.toggleStatus(Ui.status.FILLED);

      /**
       * Preloader does not exists on first rendering with presaved data
       */
      if (this.nodes.embedPreloader) {
        this.nodes.embedPreloader.style.backgroundImage = '';
      }
    });

    this.nodes.embedContainer.appendChild(this.nodes.embedElement);
  }

  /**
   * Shows caption input
   *
   * @param {string} text - caption text
   * @returns {void}
   */
  fillCaption(text) {
    if (this.nodes.caption) {
      this.nodes.caption.innerHTML = text;
    }
  }

  /**
   * Changes UI status
   *
   * @param {string} status - see {@link Ui.status} constants
   * @returns {void}
   */
  toggleStatus(status) {
    for (const statusType in Ui.status) {
      if (Object.prototype.hasOwnProperty.call(Ui.status, statusType)) {
        this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${Ui.status[statusType]}`, status === Ui.status[statusType]);
      }
    }
  }

  /**
   * Apply visual representation of activated tune
   *
   * @param {string} tuneName - one of available tunes {@link Tunes.tunes}
   * @param {boolean} status - true for enable, false for disable
   * @returns {void}
   */
  applyTune(tuneName, status) {
    this.nodes.wrapper.classList.toggle(`${this.CSS.wrapper}--${tuneName}`, status);
  }
}
