import * as React from 'react';
import 'fabric';
declare let fabric: any; // @types/fabric is only fabric 1.5 right now, so this :/
import PouchDB from 'pouchdb';

// import { Color, COLORS } from './color';
import { Gfx } from './gfx';

import './App.css';


// interface IAppProps {}

interface IAppState {
  zoomVal: number;
  plate: {value: string, 
        viewValue?: string, 
        frontTop?: {top: number, left: number},
        frontCenter?: {top: number, left: number}, 
        backTop?: {top: number, left: number},
        backCenter?: {top: number, left: number}};
  uploading: boolean;
  showLayerPanel: boolean;
}

class App extends React.Component<{}, IAppState> {
  protected gfx: Gfx;
  protected db: any;
  protected canvas: any;
  protected canvasHeight: number;
  protected canvasWidth: number;
  protected panning: boolean = false;
  protected selecting: boolean = false;
  // protected colors: Color[] = COLORS;
  protected selectedLayer: string | undefined;
  protected name: string = "New Plate";
  protected plateGroups = [
    {
      name: 'T-Shirt',
      plates: [{
        value: 'tshirt-m', 
        viewValue: 'Medium T-Shirt', 
        frontTop: {top: 3300, left: 5432},
        frontCenter: {top: 5030, left: 5432},
        backTop: {top: 2750, left: 17232}, 
        backCenter: {top: 4300, left: 17232} 
      }]
    },
    {
      name: 'Hoodie',
      disabled: true,
      plates: [
        { value: 'hoodie-m', viewValue: 'Medium Hoodie' }
      ]
    },
    {
      name: 'Long Sleeve',
      disabled: true,
      plates: [
        { value: 'longsleeve-m', viewValue: 'Medium Long Sleeve' }
      ]
    },
    {
      name: 'Tank',
      disabled: true,
      plates: [
        { value: 'tank-m', viewValue: 'Medium Tank' }
      ]
    }
  ];
  protected defaultPlate = {value: 'Select Plate'};
  protected objectToolsHidden = true;
  protected toggleNav: boolean = false;
  protected uploading: boolean = false;
  protected showRuler: boolean = true;
  // protected colorCtrl: FormControl;
  protected filteredColors: any[]; // Observable<any[]>;
  protected plateObj: any;
  protected fileInput: any;

  constructor(props:any) {
    super(props);
    this.saveGfx = this.saveGfx.bind(this);
    this.zoomReset = this.zoomReset.bind(this);
    this.zoom = this.zoom.bind(this);
    this.PlateSelect = this.PlateSelect.bind(this);
    this.plateChange = this.plateChange.bind(this);
    this.gfxFileChanged = this.gfxFileChanged.bind(this);
    this.fileInput = React.createRef();
    this.showLayerPanelOnClick = this.showLayerPanelOnClick.bind(this);
    this.hideLayerPanel = this.hideLayerPanel.bind(this);
    this.addLayerToCanvasOnClick = this.addLayerToCanvasOnClick.bind(this);
    this.removeLayerOnClick = this.removeLayerOnClick.bind(this);
    this.deleteAttachmentOnClick = this.deleteAttachmentOnClick.bind(this);
    this.sendObjectOnClick = this.sendObjectOnClick.bind(this);
    this.centerObjectOnClick = this.centerObjectOnClick.bind(this);
    this.rotateObjectOnClick = this.rotateObjectOnClick.bind(this);
    this.state = {
      zoomVal: 0.5,
      plate: this.defaultPlate,
      uploading: false,
      showLayerPanel: false
    };
    window.addEventListener('resize', () => this.resizeCanvas('') );
  }

  public render(){
    return (
      <div className="App">
        <nav id="gfx">
          <div className="inline-flex space-between">
            <button className="saveBtn" onClick={this.saveGfx}>Save</button>
          </div>
          <div className="flex">
            <button 
              id="zoomReset" 
              onClick={this.zoomReset}>
              reset zoom
            </button>
            <input type="range"
              onChange={this.zoom}
              min="0.1" 
              max="3" 
              step="0.1"
              value={this.state.zoomVal}
            />
          </div>

          <this.PlateSelect plateGroups={this.plateGroups} plate={this.state.plate} />

          <input id="designFile" type="file" multiple={true}  
            accept="image/x-png,image/gif,image/jpeg,image/svg+xml"
            disabled={this.state.uploading}
            onChange={this.gfxFileChanged} ref={this.fileInput} />

          {!this.state.showLayerPanel &&
            this.attachmentItemsForGfx().map((item:any) => {
              return (
                <div className="flex" onClick={this.showLayerPanelOnClick} key={item}>
                  <img className="attachment-img" alt={item} src={this.attachmentSrcFor(this.gfx, item)} />
                  <div>
                    <span title={item}>{item}</span>
                    <span> {this.gfx.attachmentDimensions[item]} </span>
                  </div>
                </div>
              );
            })
          }

          {this.state.showLayerPanel &&
            <div className="layerPanel">
              <button onClick={this.hideLayerPanel}>All Layers</button>
              <div>{this.selectedLayer}</div>
              {!this.isCanvasLayer(this.selectedLayer) && 
                <button onClick={this.addLayerToCanvasOnClick}>Show</button>
              }
              {this.isCanvasLayer(this.selectedLayer) && 
                <button onClick={this.removeLayerOnClick}>Hide</button>
              }
              <button onClick={this.deleteAttachmentOnClick} value={this.selectedLayer}>Delete</button>
              <div>
                <div>Center:</div>
                <button onClick={this.centerObjectOnClick} value="frontTop">
                  Front Top
                </button>
                <button onClick={this.centerObjectOnClick} value="frontCenter">
                  Front Center
                </button>
                <button onClick={this.centerObjectOnClick} value="backTop">
                  Back Top
                </button>
                <button onClick={this.centerObjectOnClick} value="backCenter">
                  Back Center
                </button>
              </div>
              <div>
                <div>Position</div>
                <button onClick={this.sendObjectOnClick} value="front">
                  Bring to Top
                </button>
                <button onClick={this.sendObjectOnClick} value="forward">
                  Bring Forward
                </button>
                <button onClick={this.sendObjectOnClick} value="backwards">
                  Send Backward
                </button>
                <button onClick={this.sendObjectOnClick} value="back">
                  Send to Bottom
                </button>
              </div>
              <button onClick={this.rotateObjectOnClick}>Rotate</button>
            </div>
          }

        </nav>
        <canvas id="c">&nbsp;</canvas>
      </div>
    );
  }

  public PlateSelect(props:any){
    const plateGroups = props.plateGroups;
    const items = plateGroups.map((group:any) =>
      <optgroup key={group.name} label={group.name} disabled={group.disabled}>
        {group.plates.map((plateItem:any) => {
          return (
            <option key={plateItem.value} value={plateItem.value}>{plateItem.viewValue}</option>
          );
        })}
      </optgroup>
    );
    return (
      <select onChange={this.plateChange} value={this.state.plate.value}> 
        <option disabled={true}>{this.defaultPlate.value}</option>
        <option value="clear">Clear</option>
        {items}
      </select>
    );
  }

  public componentDidMount(){

    this.gfx = new Gfx();
    if(navigator.vendor && navigator.vendor.indexOf('Apple') > -1){
      console.log("LOADING FRUITDONW DB!");
      this.db = new PouchDB('gfx', {adapter: 'fruitdown'});
    }else{
      this.db = new PouchDB('gfx');
    }

    this.canvas = new fabric.Canvas('c', {
      selection: false,
      renderOnAddRemove: false,
      stateful: false
    });
    this.drawRulers();

    this.canvas.on('mouse:up', (e:any) => {
      this.panning = false;
    });

    this.canvas.on('mouse:down', (e:any) => {
      this.panning = true;
    });
    this.canvas.on('mouse:move', (e:any) => {
      if (!this.selecting && this.panning && e && e.e) {
        const delta = new fabric.Point(e.e.movementX, e.e.movementY);
        this.canvas.relativePan(delta);
      }
    });
    // mouse:wheel ?
    this.canvas.on('selection:created', (e:any) => {
      this.selecting = true;
      this.showLayerPanelFor(e.target.id);
    });
    this.canvas.on('selection:updated', (e:any) => {
      this.selecting = true;
      this.showLayerPanelFor(e.target.id);
    });
    this.canvas.on('selection:cleared', (e:any) => {
      this.selecting = false;
      this.selectedLayer = undefined;
      this.setState({showLayerPanel: false});
    });


    this.resizeCanvas('');
    this.canvas.setZoom(0.5);
  }

  protected resizeCanvas(event:any): void {
    try{
      this.canvasHeight = document.documentElement.clientHeight;
      this.canvasWidth = document.documentElement.clientWidth;
      this.canvas.setWidth(this.canvasWidth);
      this.canvas.setHeight(this.canvasHeight);
    }catch(e){  console.warn('o noz! caught e in resizeCanvas e:',e);  }
  }

  protected plateChange(e:any): void{
    const plate = this.plateGroups.filter((pg:any) => pg.plates.some((p:any) => p.value === e.target.value));
    if(plate && plate[0] && plate[0].plates[0]){
      this.setState({ plate: plate[0].plates[0] });
      // this.gfx.plate = plate[0].plates[0];
      this.loadSVG(plate[0].plates[0].value);
    }else if(e.target.value === 'clear'){
      this.canvas.remove(this.plateObj);
      this.setState({plate: this.defaultPlate });
      // this.gfx.plate = undefined;
      this.canvas.renderAll();
    }
  }

  protected loadSVG(id:any):void {
    fabric.loadSVGFromURL(`gfx/${id}.svg`, (objects:any, options:any) => {
      this.plateObj = fabric.util.groupSVGElements(objects, options);
      this.plateObj.selectable = false;
      this.plateObj.hasControls = false
      this.plateObj.hasBorders = false
      this.plateObj.lockMovementX = true
      this.plateObj.lockMovementY = true
      this.plateObj.scaleX = 0.1;
      this.plateObj.scaleY = 0.1;
      this.plateObj.top = 60;
      this.plateObj.left = 60;
      this.plateObj.setCoords();
      this.canvas.add(this.plateObj);

      this.gfx.canvasLayers.forEach((l) => {
        this.canvas.getObjects().forEach((o:any) => {
          if(o.id === l) { o.bringToFront(); }
        });
      });
      this.canvas.renderAll();
      // console.log('loadSVG JSON.stringify(this.canvas):',JSON.stringify(this.canvas));
    });
  }

  protected zoom(e:any): void {
    this.setState({zoomVal: e.target.value});
    this.canvas.setZoom(e.target.value);
    this.canvas.renderAll();
  }

  protected zoomReset(e:any): void {
    this.setState({zoomVal: 0.5});
    this.canvas.setZoom(0.5);
    this.canvas.absolutePan(new fabric.Point(0, 0));
    this.canvas.renderAll();
  }

  protected drawRulers(): void{
    const grid = 30; // e.g. DPI
    const width = 2600; // ~2x tshirtz 
    const measurementThickness = 60;
    const minorFontSize = 24;
    const majorFontSize = 26;
    const rulerItems = [];

    rulerItems.push(new fabric.Rect({
      left: 0,
      top: 0,
      fill: '#DDD',
      selectable: false,
      width: measurementThickness,
      height: 2660,
      excludeFromExport: true
    }));

    rulerItems.push(new fabric.Rect({
      left: 0,
      top: 0,
      fill: '#DDD',
      width: 2660,
      selectable: false,
      height: measurementThickness,
      excludeFromExport: true
    }));

    const tickSize = 10;
    const tickSizeFoot = 40;
    let count = 1;
    let footCount = 0;

    for (let i = 0; i < (width / grid); i++) {
      const offset = (i * grid);
      const location1 = offset + measurementThickness
      const isFoot = ((i + 1) % 12) === 0 && i !== 0;

      // vertical grid
      rulerItems.push(new fabric.Line([location1, measurementThickness, location1, width], {
        stroke: isFoot ? '#888' : '#ccc',
        selectable: false,
        excludeFromExport: true
      }));

      // horizontal grid
      rulerItems.push(new fabric.Line([measurementThickness, location1, width, location1], {
        stroke: isFoot ? '#888' : '#ccc',
        selectable: false,
        excludeFromExport: true
      }));

      // left ruler
      rulerItems.push(new fabric.Line([measurementThickness - tickSize, location1, measurementThickness, location1], {
        stroke: '#888',
        selectable: false,
        excludeFromExport: true
      }));
      rulerItems.push(new fabric.Text(count.toString(), {
        left: measurementThickness - (tickSize * 2 + 10),
        top: location1,
        selectable: false,
        fontSize: minorFontSize,
        fontFamily: 'san-serif',
        excludeFromExport: true
      }));

      if (isFoot) {
        footCount++;
        rulerItems.push(new fabric.Line([measurementThickness - tickSizeFoot, location1, measurementThickness, location1], {
          stroke: '#222',
          selectable: false,
        excludeFromExport: true
        }));
        rulerItems.push(new fabric.Text(footCount + "\'", {
          left: measurementThickness - (tickSizeFoot + 10),
          top: location1 + 4,
          selectable: false,
          fontSize: majorFontSize,
          fontFamily: 'san-serif',
          excludeFromExport: true
        }));
      }

      // top ruler
      rulerItems.push(new fabric.Line([location1, measurementThickness - tickSize, location1, measurementThickness], {
        stroke: '#888',
        selectable: false,
        excludeFromExport: true
      }));
      rulerItems.push(new fabric.Text(count.toString(), {
        left: location1 + 3,
        top: measurementThickness - (tickSize * 2) - 4,
        selectable: false,
        fontSize: minorFontSize,
        fontFamily: 'san-serif',
        excludeFromExport: true
      }));

      if (isFoot) {
        rulerItems.push(new fabric.Line([location1, measurementThickness - tickSizeFoot, location1, measurementThickness], {
          stroke: '#222',
          selectable: false,
          excludeFromExport: true
        }));
        rulerItems.push(new fabric.Text(footCount + "\'", {
          left: location1 + 10,
          top: measurementThickness - (tickSizeFoot) - 7,
          selectable: false,
          fontSize: majorFontSize,
          fontFamily: 'san-serif',
          excludeFromExport: true
        }));
      }

      count++
    } // for()

    const rulerGroup = new fabric.Group(rulerItems);
    rulerGroup.excludeFromExport = true;
    this.canvas.add(rulerGroup);
    this.canvas.sendToBack(rulerGroup);

  } // drawRulers()

  protected saveGfx(){

    this.gfx.canvasData = this.canvas.toDatalessJSON(['id','selectable','lockScalingX', 'lockScalingY', 'hasControls', 'hasBorders', 'lockMovementX', 'lockMovementY']);    
    
    this.canvas.getObjects().forEach((o:any) => {
      if(o.excludeFromExport) {
        o.opacity = 0;
        this.canvas.renderAll();
      }
    });
    this.gfx.canvasDataImg = this.canvas.toDataURL({format: 'png', width: 1200, height: 550});
    this.canvas.getObjects().forEach((o:any) => {
      if(o.excludeFromExport) {
        o.opacity = 1;
        this.canvas.renderAll();
      }
    });

    this.db.put(this.gfx).then((resp:any) => {
      if(resp.rev){
        this.gfx._rev = resp.rev;
      }

      this.db.get(this.gfx._id, {attachments: true}).then( (gfx:Gfx) => {
        this.gfx = gfx;
      }, (err:any) => console.warn('o noz, getGfx err:',err));

    }, (err:any) =>{
      console.log('o noz! saveGfx err:',err);
    });
  }

  protected gfxFileChanged(e:any){
    this.setState({uploading: true});
    this.gfx._attachments = this.gfx._attachments || {};
    let description;
    const files = this.fileInput.current.files;
    for(const file of files){
      description = description ? `${description}, ${file.name}` : file.name;
      this.gfx._attachments[file.name] = {
        "content_type": file.type,
        "data": file
      }
    }

    // this.gfx.history = this.gfx.history || [];
    // this.gfx.history.push({date: new Date, title: `Added ${e.target.files.length} GFX Attachment${e.target.files.length > 1 ? 's' : ''}`, description: description});

    this.db.put(this.gfx).then((resp:any) => {
      if(resp.rev){
        this.gfx._rev = resp.rev;
      }

      this.db.get(this.gfx._id, {attachments: true}).then( (gfx:Gfx) => this.gfx = gfx, (err:any) => console.log('o noz, getGfx err:',err));

      setTimeout( () => {
        for(const item of files){
          this.getDimensionsFor(item.name);
          this.addLayerToCanvas(item.name);
        }
      },1000);

      setTimeout( () => {
        this.fileInput.current.value = '';
        this.setState({uploading: false});
      }, 2500);

    }, (err:any) =>{
      console.warn('o noz! saveGfx err:',err);
      this.setState({uploading: false});
    });

  }

  protected attachmentItemsForGfx(){
    return this.gfx && this.gfx._attachments ? Object.keys(this.gfx._attachments) : [];
  }
  
  protected attachmentSrcFor(gfx:Gfx,itemKey:string){
    try{
      const contentType = gfx._attachments[itemKey].content_type;
      const data = gfx._attachments[itemKey].data;
      return (data && contentType && contentType.match(/image/i)) ? `data:${contentType};base64,${data}` : ''; 
    }catch(err){
      console.warn('attachmentSrcFor err:',err);
      return '';
    }      
  }

  protected getDimensionsFor(itemKey:string): void {
    try{
      const contentType = this.gfx._attachments[itemKey].content_type;
      const data = this.gfx._attachments[itemKey].data;
      if(data && contentType && contentType.match(/image/i)){
        const img = new Image();
        img.onload = () => {
          const height = (img.height / 300).toFixed(2);
          const width = (img.width / 300).toFixed(2);
          this.gfx.attachmentDimensions[itemKey] = `h:${height}" w:${width}"`;
          this.saveGfx();
        };
        img.src = `data:${contentType};base64,${data}`;
      }
    }catch(err){  console.warn('dimensionsFor err:',err);  } 
  }

  protected deleteAttachmentOnClick(e:any){
    this.deleteAttachmentFor(e.target.value);
  }

  protected deleteAttachmentFor(itemKey:any){
    console.log('deleteAttachmentFor itemKey',itemKey);
    this.db.removeAttachment(this.gfx._id, itemKey, this.gfx._rev).then((result:any) => {
      // handle result
      if(result.rev){
        this.gfx._rev = result.rev;
      }
      try{
        delete this.gfx._attachments[itemKey];
        console.log('deleteAttachmentFor gonna removeLayer itemKey',itemKey);
        this.removeLayer(itemKey);
      }catch(err){ console.log('o noz! delete _attachments err:',err); }
    }).catch((err:any) => {
      console.warn('o noz! removeAttachment err:',err);
    });
  }

  protected showLayerPanelOnClick(e:any){
    console.log('showLayerPanelOnClick e:',e.target.title);
    this.showLayerPanelFor(e.target.title);
  }

  protected showLayerPanelFor(itemKey:string){
    this.selectedLayer = itemKey;
    this.setState({showLayerPanel: true});
    if(!this.canvas.getActiveObject() || this.canvas.getActiveObject().id !== itemKey){
      this.canvas.getObjects().forEach((o:any) => {
        if(o.id === itemKey) {
          this.canvas.setActiveObject(o);
          this.canvas.renderAll();
        }
      });
    }
  }
  protected hideLayerPanel(){
    this.selectedLayer = undefined;
    this.setState({showLayerPanel: false});
  }

  protected addLayerToCanvasOnClick(e:any){
    this.addLayerToCanvas(this.selectedLayer);
  }

  protected addLayerToCanvas(itemKey:any){
    if(this.gfx.canvasLayers.indexOf(itemKey) < 0){
      let idExists = false;
      this.canvas.getObjects().forEach((o:any) => {
        if(o.id === itemKey) {
          idExists = true
        }
      });
      if(!idExists){
        this.gfx.canvasLayers.push(itemKey);
        if(this.gfx.canvasLayerColors[itemKey] === undefined){
          this.gfx.canvasLayerColors[itemKey] = [];
        }
        
        const canvas = this.canvas;
        fabric.Image.fromURL(this.attachmentSrcFor(this.gfx, itemKey), (i:any) => {
          i.scaleX = 0.1;
          i.scaleY = 0.1;
          i.originX = 'center';
          i.originY = 'center';
          i.top = (i.height * 0.05) + 60;
          i.left = (i.width * 0.05) + 60;
          i.setCoords();
          // i.lockRotation = true;
          i.lockScalingX = i.lockScalingY = true;
          // i.hasControls = false;
          i.setControlsVisibility({
            mt: false, 
            mb: false, 
            ml: false, 
            mr: false, 
            bl: false,
            br: false, 
            tl: false, 
            tr: false,
            mtr: true
          });
          i.centeredRotation = true;
          // i.hasBorders = false;
          i.id = itemKey;
          canvas.add(i); 
          canvas.setActiveObject(i);
          canvas.renderAll();
        });
      }
    }
  }

  protected removeLayerOnClick(e:any){
    this.removeLayer(this.selectedLayer);
  }

  protected removeLayer(itemKey:any){
    try{
      this.canvas.remove(this.canvas.getActiveObject());
      this.canvas.renderAll();
      this.hideLayerPanel();
      delete this.gfx.canvasLayerColors[itemKey];
      this.gfx.canvasLayers.splice(this.gfx.canvasLayers.indexOf(itemKey), 1);
      console.log('removeLayer itemKey',itemKey,' gfx:',this.gfx);
    }catch(e){  console.warn('could not remove layer:',itemKey,' e:',e);  }
  }

  protected isCanvasLayer(itemKey:any): boolean{
    return this.gfx.canvasLayers.indexOf(itemKey) > -1;
  }

  protected sendObjectOnClick(e:any){
    this.sendObject(e.target.value);
  }

  protected sendObject(dir:string): void{
    if(dir === 'backwards'){
      this.canvas.getActiveObject().sendBackwards();
    }else if(dir === 'back'){
      this.canvas.getActiveObject().sendToBack();
    }else if(dir === 'forewards'){
      this.canvas.getActiveObject().brintForwards();
    }else if(dir === 'front'){
      this.canvas.getActiveObject().bringToFront();
    }
    this.canvas.renderAll();
  }

  protected rotateObjectOnClick(e:any){
    this.rotateObject();
  }

  protected rotateObject(): void{
    let currentAngle = this.canvas.getActiveObject().get('angle');
    if(currentAngle % 90 !== 0){
      currentAngle = currentAngle - (currentAngle % 90);
    }
    this.canvas.getActiveObject().rotate(currentAngle + 90);
    this.canvas.renderAll();
  }

  protected centerObjectOnClick(e:any){
    this.centerObject(e.target.value);
  }

  protected centerObject(on:string): void{
    if(this.state.plate && this.state.plate[on]){
      this.canvas.getActiveObject().set({
        top: (this.state.plate[on].top * 0.1) + 60,
        left: (this.state.plate[on].left * 0.1) + 60
      });
      this.canvas.renderAll();
    }
  }

}

export default App;
