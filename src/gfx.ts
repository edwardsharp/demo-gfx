export class Gfx {
  /* tslint:disable:variable-name */
  public _id?: string;
  public _rev?: string;
  public _attachments?: any;
  /* tslint:enable:variable-name */
  public createdAt?: Date;
  public notes?: string;
  public plate?: {name: string, value: string};
  public canvasLayers: string[];
  public attachmentDimensions?: any;
  public canvasLayerColors?: any;
  public canvasData?: any;
  public canvasDataImg?: any;

  constructor() { 
    this._id = this._id || Math.floor(Date.now()).toString(36); 
    this.createdAt = new Date(parseInt(this._id, 36));
    this.canvasLayers = [];
    this.attachmentDimensions = {};
    this.canvasLayerColors = {};
  }

}
