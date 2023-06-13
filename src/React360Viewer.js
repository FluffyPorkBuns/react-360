import React, { Component } from "react";
import Button from './components/Button'
import './style.css'

import HammerComponent from 'react-hammerjs';

class React360Viewer extends Component {

    constructor(props) {
        super(props);
        //this.imageContainerRef = React.createRef();
        this.viewPercentageRef = React.createRef();
        this.viewPortElementRef = React.createRef();
        this.canvas = null
        this.ctx = null
        this.isMobile = false
        this.imageData = []
        this.images = []
        this.loadedImages = 0
        this.viewerPercentage = null
        this.currentImage = null
        this.currentLeftPosition = this.currentTopPosition = 0
        this.currentCanvasImage = null
        this.centerX = 0
        this.centerY = 0
        this.movementStart = 0
        this.movement = false
        this.speedFactor = 13
        this.activeImage = this.props.overrideImage + 1 || 1
        this.stopAtEdges = false

        this.state = {
            lastX: 0,
            lastY: 0,
            minScale: 0.5,
            maxScale: 4,
            scale: 0.2,
            customOffset: 10,
            currentScale: 1,
            currentTopPosition: 0,
            currentLeftPosition: 0,
            selectMenuOption: 1,
            currentImage: null,
            dragging: false,
            canvas: null,
            ctx: null,
            dragStart: null,
            currentCanvasImage: null,
            isFullScreen: false,
            viewPortElementWidth: null,
            movementStart: 0,
            movement: false,
            dragSpeed: 150,
            speedFactor: 13,
            activeImage: this.props.overrideImage + 1 || 1,
            stopAtEdges: false,
            panmode: false,
            currentLoop: 0,
            loopTimeoutId: 0,
            playing: false,
            imagesLoaded: false
        }

        //this.currentLeftPosition = this.currentLeftPosition.bind(this)
    }

    componentDidMount(){
        window.addEventListener('resize', this?.updateDimensions);
        this.disableZoomin()
        this.viewerPercentage = this.viewPercentageRef.current
        //console.log(this.viewerContainerRef.getElementsByClassName('v360-viewport-container'))

        this.viewPortElementRef = this.viewerContainerRef.getElementsByClassName('v360-viewport-container')[0]
        this.fetchData()
    }

    componentWillUnmount() {
      window.removeEventListener('resize', this?.updateDimensions);
    }

    updateDimensions = () => {
      // this.setState({ width: window.innerWidth, height: window.innerHeight });
      this?.setImage();
    };

    fetchData(){
        if(this.props.images) {
          this.imageData = [...this.props.images];
        } else {
          for(let i=1; i <= this.props.amount; i++){
              const imageIndex = (this.props.paddingIndex) ? this.lpad(i, "0", 2) : i
              const fileName = this.props.fileName?.replace('{index}', imageIndex);
              const filePath = `${this.props.imagePath}/${fileName}`.replace(/([^:]\/)\/+/g, "$1");
              this.imageData.push(filePath)
          }
        }

        this.preloadImages()
    }

    isTruthy(valueToCheck) {
      if(valueToCheck === true || (typeof valueToCheck === 'string' && valueToCheck.toLowerCase() === 'true')) {
        return true;
      }
      return false;
    }

    getSpeedFactor() {
      if(!isNaN(this.props.speed) && Math.abs(this.props.speed) !== 0) {
        return this.speedFactor / Math.abs(this.props.speed);
      }
      return this.speedFactor;
    }

    lpad(str, padString, length) {
        str = str.toString()
        while (str.length < length) str = padString + str
        return str
    }

    preloadImages() {
        if (this.imageData.length) {
            try {
                //this.props.amount = this.imageData.length;
                this.imageData.forEach(src => {
                    this.addImage(src);
                });
            } catch (error) {
                console.error(`Something went wrong while loading images: ${error.message}`);
            }
        } else {
            console.log('No Images Found')
        }
    }

    addImage(resultSrc){
        const image = new Image();
        image.src = resultSrc;
        //image.crossOrigin='anonymous'
        image.onload = this.onImageLoad.bind(this);
        image.onerror = this.onImageLoad.bind(this);
        this.images.push(image);
    }

    onImageLoad(event) {
        const percentage = Math.round(this.loadedImages / this.props.amount * 100);
        this.loadedImages += 1;
        this.updatePercentageInLoader(percentage);
        if (this.loadedImages === this.props.amount) {
            this.onAllImagesLoaded(event);
        } else if (this.loadedImages === 1) {
            //this.onFirstImageLoaded(event);
            console.log('load first image')
        }
    }

    updatePercentageInLoader(percentage) {
        /* if (this.loader) {
            this.loader.style.width = percentage + '%';
        }
        if (this.view360Icon) {
            this.view360Icon.innerText = percentage + '%';
        } */
        //console.log(percentage)
        this.viewerPercentage.innerHTML = percentage + '%';
        //console.log(percentage + '%')
    }

    onAllImagesLoaded(e){
        this.setState({ imagesLoaded: true })
        this.props.onLoaded && this.props.onLoaded(this.images)
        this.initData()
    }

    initData(){
        //console.log(this.imageContainerRef)
        this.canvas = this.imageContainerRef
        this.ctx = this.canvas.getContext('2d')
        //console.log('initialize data here')

        this.attachEvents();

        this.checkMobile()
        this.loadInitialImage()

        this.setState({ playing: this.props.autoplay })
    }

    attachEvents(){
        if(this.state.panmode){
            this.bindPanModeEvents()
        }else{
            this.bind360ModeEvents()
        }
    }

    bindPanModeEvents(){
        this.viewPortElementRef.removeEventListener('touchend', this.touchEnd);
        this.viewPortElementRef.removeEventListener('touchstart', this.touchStart);
        this.viewPortElementRef.removeEventListener('touchmove', this.touchMove);

        this.viewPortElementRef.addEventListener('touchend', this.stopDragging);
        this.viewPortElementRef.addEventListener('touchstart', this.startDragging);
        this.viewPortElementRef.addEventListener('touchmove', this.doDragging);

        this.viewPortElementRef.removeEventListener('mouseup', this.stopMoving);
        this.viewPortElementRef.removeEventListener('mousedown', this.startMoving);
        this.viewPortElementRef.removeEventListener('mousemove', this.doMoving);

        this.viewPortElementRef.addEventListener('mouseup', this.stopDragging);
        this.viewPortElementRef.addEventListener('mousedown', this.startDragging);
        this.viewPortElementRef.addEventListener('mousemove', this.doDragging);
    }

    bind360ModeEvents(){
        this.viewPortElementRef.removeEventListener('touchend', this.stopDragging);
        this.viewPortElementRef.removeEventListener('touchstart', this.startDragging);
        this.viewPortElementRef.removeEventListener('touchmove', this.doDragging);

        this.viewPortElementRef.addEventListener('touchend', this.touchEnd);
        this.viewPortElementRef.addEventListener('touchstart', this.touchStart);
        this.viewPortElementRef.addEventListener('touchmove', this.touchMove);

        this.viewPortElementRef.removeEventListener('mouseup', this.stopDragging);
        this.viewPortElementRef.removeEventListener('mousedown', this.startDragging);
        this.viewPortElementRef.removeEventListener('mousemove', this.doDragging);

        this.viewPortElementRef.addEventListener('mouseup', this.stopMoving);
        this.viewPortElementRef.addEventListener('mousedown', this.startMoving);
        this.viewPortElementRef.addEventListener('mousemove', this.doMoving);
    }

    startDragging = (evt) => {
        this.dragging = true
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        this.setLastPositions(evt)

        this.dragStart = this.ctx.transformedPoint(this.state.lastX,this.state.lastY);
    }

    setLastPositions(evt){
        if(this.isMobile){
            this.setState({
                lastX: evt.touches[0].offsetX || (evt.touches[0].pageX - this.canvas.offsetLeft),
                lastY: evt.touches[0].offsetY || (evt.touches[0].pageY - this.canvas.offsetTop)
            })
        }else{
            this.setState({
                lastX: evt.offsetX || (evt.pageX - this.canvas.offsetLeft),
                lastY: evt.offsetY || (evt.pageY - this.canvas.offsetTop)
            })
        }
    }

    doDragging = (evt) => {

        this.setLastPositions(evt)

        if (this.dragStart){
            let pt = this.ctx.transformedPoint(this.state.lastX,this.state.lastY);
            this.ctx.translate(pt.x-this.dragStart.x,pt.y-this.dragStart.y);
            this.redraw();
        }
    }

    stopDragging = (evt) => {
        this.dragging = false
        this.dragStart = null
    }

    checkMobile(){
        this.isMobile = !!('ontouchstart' in window || navigator.msMaxTouchPoints);
    }

    loadInitialImage(){
        this.currentImage = this.imageData[this.props.overrideImage || 0]
        this.setImage()
    }

    setImage(cached = false){
        this.currentLeftPosition = this.currentTopPosition = 0

        if(!cached){
            this.currentCanvasImage = new Image()
            this.currentCanvasImage.crossOrigin='anonymous'
            this.currentCanvasImage.src = this.currentImage
            this.currentCanvasImage.onload = () => {
                let viewportElement = this.viewPortElementRef.getBoundingClientRect()
                this.canvas.width  = (this.state.isFullScreen) ? viewportElement.width : this.currentCanvasImage.width
                this.canvas.height = (this.state.isFullScreen) ? viewportElement.height : this.currentCanvasImage.height
                this.trackTransforms(this.ctx)
                this.redraw()
            }
            this.currentCanvasImage.onerror = () => {
                console.log('cannot load this image')
            }
        }else{
            this.currentCanvasImage = this.images[this.activeImage - 1 || 0]
            let viewportElement = this.viewPortElementRef.getBoundingClientRect()
            this.canvas.width  = (this.state.isFullScreen) ? viewportElement.width : this.currentCanvasImage.width
            this.canvas.height = (this.state.isFullScreen) ? viewportElement.height : this.currentCanvasImage.height
            this.trackTransforms(this.ctx)
            this.redraw()
        }

    }

    redraw(){
        try {
            let p1 = this.ctx.transformedPoint(0,0);
            let p2 = this.ctx.transformedPoint(this.canvas.width,this.canvas.height)
            let hRatio = this.canvas.width / this.currentCanvasImage.width
            let vRatio =  this.canvas.height / this.currentCanvasImage.height
            let ratio  = Math.min(hRatio, vRatio);
            let centerShift_x = (this.canvas.width - this.currentCanvasImage.width*ratio )/2
            let centerShift_y = (this.canvas.height - this.currentCanvasImage.height*ratio )/2
            this.ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);
            this.centerX = this.currentCanvasImage.width*ratio/2
            this.centerY = this.currentCanvasImage.height*ratio/2

            //center image
            this.ctx.drawImage(this.currentCanvasImage, this.currentLeftPosition, this.currentTopPosition, this.currentCanvasImage.width, this.currentCanvasImage.height,
                        centerShift_x,centerShift_y,this.currentCanvasImage.width*ratio, this.currentCanvasImage.height*ratio);
            // WebKit fix for image not showing in canvas on init
            if(navigator.userAgent.indexOf('AppleWebKit') !== -1){
              const originalPosition = this.canvas.style.position;
              this.canvas.style.position='absolute';
              this.canvas.style.display='table';
              // eslint-disable-next-line no-unused-expressions
              this.canvas.offsetHeight; // no need to store this anywhere, the reference is enough
              this.canvas.style.display='';
              this.canvas.style.position = originalPosition;
            }
            //this.addHotspots()
        }
        catch(e){
            this.trackTransforms(this.ctx)
        }
    }

    trackTransforms(ctx){
        return new Promise(resolve => {
            var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
            var xform = svg.createSVGMatrix();
            this.ctx.getTransform = function(){ return xform; };

            var savedTransforms = [];
            var save = ctx.save;
            this.ctx.save = () => {
                savedTransforms.push(xform.translate(0,0));
                return save.call(this.ctx);
            };
            var restore = ctx.restore;
            this.ctx.restore = () => {
                xform = savedTransforms.pop();
                return restore.call(this.ctx);
            };
            var scale = this.ctx.scale;
            this.ctx.scale = (sx,sy) => {
                xform = xform.scaleNonUniform(sx,sy);
                return scale.call(this.ctx,sx,sy);
            };
            var rotate = this.ctx.rotate;
            this.ctx.rotate = (radians) => {
                xform = xform.rotate(radians*180/Math.PI);
                return rotate.call(this.ctx,radians);
            };
            var translate = this.ctx.translate;
            this.ctx.translate = (dx,dy) => {
                xform = xform.translate(dx,dy);
                return translate.call(this.ctx,dx,dy);
            };
            var transform = this.ctx.transform;
            this.ctx.transform = (a,b,c,d,e,f) => {
                var m2 = svg.createSVGMatrix();
                m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
                xform = xform.multiply(m2);
                return transform.call(this.ctx,a,b,c,d,e,f);
            };
            var setTransform = this.ctx.setTransform;
            this.ctx.setTransform = (a,b,c,d,e,f) => {
                xform.a = a;
                xform.b = b;
                xform.c = c;
                xform.d = d;
                xform.e = e;
                xform.f = f;
                return setTransform.call(this.ctx,a,b,c,d,e,f);
            };
            var pt  = svg.createSVGPoint();
            this.ctx.transformedPoint = (x,y) => {
                pt.x=x; pt.y=y;
                return pt.matrixTransform(xform.inverse());
            }
            resolve(this.ctx)
        })

    }

    prev = (sourceEvent) => {
        //console.log(this.currentLeftPosition)
        /* this.setState({
            currentLeftPosition: 10
        }) */
        //this.currentLeftPosition = 10
        (this.isTruthy(this.props.spinReverse)) ? this.turnRight(sourceEvent) : this.turnLeft(sourceEvent)
    }

    next = (sourceEvent) => {
        (this.isTruthy(this.props.spinReverse)) ? this.turnLeft(sourceEvent) : this.turnRight(sourceEvent)
    }

    resetPosition = () => {
        const updateCallback = this.updateCallback(this.activeImage)
        this.currentScale = 1
        this.activeImage = this.props.overrideImage + 1 || 1
        updateCallback(this.activeImage)
        this.setImage(true)
    }

    turnLeft(sourceEvent){
        this.moveActiveIndexDown(1, sourceEvent);
    }

    turnRight(sourceEvent){
        this.moveActiveIndexUp(1, sourceEvent);
    }

    moveActiveIndexUp(itemsSkipped, sourceEvent) {
        const updateCallback = this.updateCallback(this.activeImage, sourceEvent)
        if (this.stopAtEdges) {
            if (this.activeImage + itemsSkipped >= this.props.amount) {
                this.activeImage = this.props.amount;
            } else {
                this.activeImage += itemsSkipped;
            }
        } else {
            this.activeImage = (this.activeImage + itemsSkipped) % this.props.amount || this.props.amount;
        }

        updateCallback()
        this.update()
    }

    moveActiveIndexDown(itemsSkipped, sourceEvent) {
        const updateCallback = this.updateCallback(this.activeImage, sourceEvent)
        if (this.stopAtEdges) {
            if (this.activeImage - itemsSkipped <= 1) {
                this.activeImage = 1;
            } else {
                this.activeImage -= itemsSkipped;
            }
        } else {
            if (this.activeImage - itemsSkipped < 1) {
                this.activeImage = this.props.amount + (this.activeImage - itemsSkipped);
            } else {
                this.activeImage -= itemsSkipped;
            }
        }

        updateCallback()
        this.update()
    }

    update() {
        const newImage = this.images[this.activeImage - 1]
        this.currentCanvasImage = newImage
        this.redraw()
    }

    updateCallback = (oldImage, sourceEvent) => () => this.props.onUpdate && this.props.onUpdate({index: oldImage - 1, image: this.images[this.activeImage - 1]}, {index: this.activeImage - 1, image: this.images[this.activeImage - 1]}, sourceEvent)

    zoomImage = (evt) => {
        if(this.isTruthy(this.props.allowZoom)) {
            this.setState({
                lastX: evt.offsetX || (evt.pageX - this.canvas.offsetLeft),
                lastY: evt.offsetY || (evt.pageY - this.canvas.offsetTop)
            })

            var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.deltaY ? -evt.deltaY : 0;

            if (delta) this.zoom(delta);
            //return evt.preventDefault() && false;
        }

    }

    zoomIn = (evt) => {
        this.setState({
            lastX: this.centerX,
            lastY: this.centerY
        })
        //this.lastY = this.centerY
        this.zoom(2)
    }
    zoomOut = (evt) => {
        this.setState({
            lastX: this.centerX,
            lastY: this.centerY
        })
        this.zoom(-2)
    }

    zoom(clicks){
        //console.log(this.lastX + ' - ' + this.lastY)
        let factor = Math.pow(1.01,clicks);
        //console.log(factor)
        if(factor > 1){
            this.currentScale += factor
        }else{
            if(this.currentScale-factor > 1)
                this.currentScale -= factor
            else
                this.currentScale = 1
        }

        if(this.currentScale > 1){
            let pt = this.ctx.transformedPoint(this.state.lastX,this.state.lastY);
            this.ctx.translate(pt.x,pt.y);

            //console.log(this.currentScale)
            this.ctx.scale(factor,factor);
            this.ctx.translate(-pt.x,-pt.y);
            this.redraw();
        }
    }

    disableZoomin(){
        document.addEventListener("gesturestart", function (e) {
          e.preventDefault();
            document.body.style.zoom = 0.99;
        });
        document.addEventListener("gesturechange", function (e) {
          e.preventDefault();
          document.body.style.zoom = 0.99;
        });

        document.addEventListener("gestureend", function (e) {
            e.preventDefault();
            document.body.style.zoom = 1;
        });
    }


    onMove(pageX){
        if (pageX - this.movementStart >= this.getSpeedFactor()) {
            let itemsSkippedRight = Math.floor((pageX - this.movementStart) / this.getSpeedFactor()) || 1;

            this.movementStart = pageX;
            if (this.props.spinReverse) {
                this.moveActiveIndexDown(itemsSkippedRight, 'swipe');
            } else {
                this.moveActiveIndexUp(itemsSkippedRight, 'swipe');
            }
            this.redraw();
        } else if (this.movementStart - pageX >= this.getSpeedFactor()) {
            let itemsSkippedLeft = Math.floor((this.movementStart - pageX) / this.getSpeedFactor()) || 1;

            this.movementStart = pageX;
            if (this.props.spinReverse) {
                this.moveActiveIndexUp(itemsSkippedLeft, 'swipe');
            } else {
                this.moveActiveIndexDown(itemsSkippedLeft, 'swipe');
            }
            this.redraw();
        }
    }

    startMoving = (evt) => {
        this.movement = true
        this.movementStart = evt.pageX;
        this.viewPortElementRef.style.cursor = 'grabbing';
    }

    doMoving = (evt) => {
        if(this.movement){
            this.onMove(evt.clientX)
        }
    }

    stopMoving = (evt) => {
        this.movement = false
        this.movementStart = 0
        this.viewPortElementRef.style.cursor = 'grab'
    }

    touchStart = (evt) => {
        this.movementStart = evt.touches[0].clientX
    }

    touchMove = (evt) => {
        this.onMove(evt.touches[0].clientX)
    }

    touchEnd = () => {
        this.movementStart = 0
    }

    play = (e) => {
        this.setState({
            loopTimeoutId: window.setInterval(() => this.loopImages(), 100)
        })
    }

    onSpin() {
        if (this.state.playing || this.state.loopTimeoutId) {
            this.stop();
        }
    }

    stop() {
        if(this.activeImage === 1){
            this.setState({ currentLoop: 0 })
        }
        this.setState({ playing: false })
        window.clearTimeout(this.state.loopTimeoutId);
    }

    loopImages() {
        let loop = (this.props.loop) ? this.props.loop : 1

        if(this.activeImage === 1){
            if(this.state.currentLoop === loop){
                this.stop()
            }
            else{
                this.setState({ currentLoop: this.state.currentLoop + 1 })

                this.next()
            }
        }
        else{
            this.next()
        }
    }

    togglePlay = (e) => {
        this.setState({ playing: !this.state.playing })
    }

    togglePanMode = (e) => {
        this.setState({ panmode: !this.state.panmode })
    }

    toggleFullScreen = (e) => {
        this.setState({ isFullScreen: !this.state.isFullScreen })
    }

    componentDidUpdate(prevProps, prevState) {
        if((prevProps.fileName !== this.props.fileName ||
          prevProps.imagePath !== this.props.imagePath ||
          prevProps.images !== this.props.images) && this.ctx) {
          this.redraw();
          this.setState({imagesLoaded: false})
          this.imageData = [];
          this.images = [];
          this.loadedImages = 0;
          this.fetchData();
        }

        if(prevProps.overrideImage !== this.props.overrideImage && this.ctx) {
          this.setState({activeImage: this.props.overrideImage + 1});
          this.loadInitialImage();
        }

        if(this.state.currentLeftPosition !== prevState.currentLeftPosition){
            console.log('Left Position Changed')
        }

        if(this.state.panmode !== prevState.panmode){
            this.attachEvents()
        }

        if(this.state.playing !== prevState.playing){
            if(!this.state.playing){
                this.stop()
            }else{
                this.play()
            }
        }

        if(this.state.isFullScreen !== prevState.isFullScreen){
            if(!this.state.isFullScreen){
                //exit full screen
                this.viewerContainerRef.classList.remove('v360-main')
                this.viewerContainerRef.classList.remove('v360-fullscreen')
            }else{
                //enter full screen
                this.viewerContainerRef.classList.add('v360-main')
                this.viewerContainerRef.classList.add('v360-fullscreen')

            }
        }
    }

    handlePinch = (e) => {
        if (e.scale < this.currentScale) {
        // zoom in
            this.zoomIn();
        } else if (e.scale > this.currentScale) {
        // zoom out
            this.zoomOut();
        }

        //lastScale = e.scale;
    }

    pinchOut = () => {
        this.currentScale = 1
    }

    render() {

        return (
            <div>
                <div className="v360-viewer-container" ref={(inputEl) => {this.viewerContainerRef = inputEl}} id={this.props.id ? this.props.id : "identifier"} onWheel={(e) => this.zoomImage(e)}>

                    {!this.state.imagesLoaded &&
                      <div className="v360-viewport">
                          <div className="v360-spinner-grow"></div>
                          <p ref={this.viewPercentageRef}
                            className={`v360-percentage-text ${!this.isTruthy(this.props.showPercentage) && "sr-only"}`}>
                          </p>
                          {this.props.loadingIndicator && <this.props.loadingIndicator />}
                      </div>
                    }
                    <HammerComponent onPinchIn={this.handlePinch} onPinchOut={this.handlePinch} onPinchEnd={this.pinchOut}
                        options={{
                        recognizers: {
                            pinch: { enable: this.isTruthy(this.props.allowPinch) }
                        }
                    }}>
                        <div className="v360-viewport-container v360-viewport">
                            <canvas
                                aria-label={this.props.label}
                                className={`v360-image-container ${!this.state.imagesLoaded && "sr-only"}`}
                                ref={(inputEl) => {this.imageContainerRef = inputEl}}
                            ></canvas>
                            {this.props.boxShadow ? <div className="v360-product-box-shadow"></div> : ''}
                        </div>
                    </HammerComponent>

                    {this.isTruthy(this.props.showMenu) && <abbr title="Fullscreen Toggle">
                        <div className="v360-fullscreen-toggle text-center" onClick={this.toggleFullScreen}>
                            <div className={this.props.buttonClass === 'dark' ? 'v360-fullscreen-toggle-btn text-light' : 'v360-fullscreen-toggle-btn text-dark'}>
                                <i className={!this.state.isFullScreen ? 'fas fa-expand text-lg' : 'fas fa-compress text-lg'}></i>
                            </div>
                        </div>
                    </abbr>}

                    {
                      this.props.buttonNext && <this.props.buttonNext onClick={()=>this.next('nextArrow')} disabled={!this.state.imagesLoaded} />
                    }

                    {
                      this.props.buttonPrevious && <this.props.buttonPrevious onClick={()=>this.prev('previousArrow')} disabled={!this.state.imagesLoaded} />
                    }

                    {
                      this.props.buttonPlay && <this.props.buttonPlay onClick={()=>this.togglePlay()} disabled={!this.state.imagesLoaded} />
                    }

                    {
                      this.props.buttonExpand && <this.props.buttonExpand onClick={()=>this.toggleFullScreen()} disabled={!this.state.imagesLoaded} />
                    }

                    {this.isTruthy(this.props.showMenu) && <div id="v360-menu-btns" className={this.props.buttonClass}>
                        <div className="v360-navigate-btns">
                            <Button
                                clicked={this.togglePlay}
                                icon={this.state.playing ? 'fa fa-pause' : 'fa fa-play'}
                            />
                            <Button
                                clicked={this.zoomIn}
                                icon="fa fa-search-plus"
                            />
                            <Button
                                clicked={this.zoomOut}
                                icon="fa fa-search-minus"
                            />

                            {this.state.panmode ? <Button clicked={this.togglePanMode} text="360&deg;"/> : <Button clicked={this.togglePanMode} icon="fa fa-hand-paper"/>}

                            <Button
                                clicked={this.prev}
                                icon="fa fa-chevron-left"
                            />
                            <Button
                                clicked={this.next}
                                icon="fa fa-chevron-right"
                            />
                            <Button
                                clicked={this.resetPosition}
                                icon="fa fa-sync"
                            />
                        </div>
                    </div> }
                </div>
            </div>

        );
    }

}

export default React360Viewer;
