var JsonDemLoader = function(filepath){
    this.sampleData = null;
    this.width = 0;
    this.height = 0;
    this.min = 0;
    this.max = 0;
    this.firstRowSum = 0; // number of vertice after travelling through the first row (considering we don't use the last col)

    this.geometry = null;

    // meters per pixel (SRTM3 spec)
    this._groundResolution = 90.;
    this._init(filepath);
    console.log(this);
}



JsonDemLoader.prototype._init = function(filepath){

    var that = this;

    $.ajax({
        url: filepath,
        dataType: 'json',
        async: false,
        //data: myData,
        success: function(json) {
            that.sampleData = json.data;
            that.width = json.size.width;
            that.height = json.size.height;
            that.min = json.min == -32768 ? 0 : json.min;
            that.max = json.max;
            that.firstRowSum = (that.width * 2) - 1;
        }
    });

}

JsonDemLoader.prototype.buildGeometry = function(threeGeom){
    this.geometry = threeGeom;

    console.log("Building vertice list...");
    this._buildVertices();

    console.log("Building faces list...");
    this._buildTriangles();

}

JsonDemLoader.prototype._buildVertices = function(){

    // PART 1:
    // loops for computing the vertices positions
    for(var iy=0; iy<this.height - 1; iy++){

        for(var ix=0; ix<this.width - 1; ix++){

            // first row
            if(ix == 0 && iy == 0){
                var a = new THREE.Vector3( ix, this._getHeight(iy, ix), iy);
                var b = new THREE.Vector3( ix+1, this._getHeight(iy, ix+1), iy );
                var c = new THREE.Vector3( ix+1, this._getHeight(iy+1, ix+1), iy+1 );
                var d = new THREE.Vector3( ix, this._getHeight(iy+1, ix), iy+1 );
                this.geometry.vertices.push(a);
                this.geometry.vertices.push(b);
                this.geometry.vertices.push(c);
                this.geometry.vertices.push(d);

            }else if(iy == 0){
                var b = new THREE.Vector3( ix+1, this._getHeight(iy, ix+1), iy );
                var c = new THREE.Vector3( ix+1, this._getHeight(iy+1, ix+1), iy+1 );
                this.geometry.vertices.push(b);
                this.geometry.vertices.push(c);

            }else if(ix == 0){
                var c = new THREE.Vector3( ix+1, this._getHeight(iy+1, ix+1), iy+1 );
                var d = new THREE.Vector3( ix, this._getHeight(iy+1, ix), iy+1 );
                this.geometry.vertices.push(c);
                this.geometry.vertices.push(d);

            }else{
                var c = new THREE.Vector3( ix+1, this._getHeight(iy+1, ix+1), iy+1  );
                this.geometry.vertices.push(c);
            }


        }

    }

}

// returns the pixel value - min and adjusted with a factor
JsonDemLoader.prototype._getHeight = function(y, x){
    // NO DATA from SRTM (ocean)
    if(this.sampleData[y][x] == -32768){
        return 0;
    }

    return ( (this.sampleData[y][x] - this.min) / this._groundResolution );
}


// buil the list of triangle from the list of vertice
// (directly in the Threejs geometry)
JsonDemLoader.prototype._buildTriangles = function(){
    // geometry.faces.push( new THREE.Face3( 0, 1, 2 ) );

    // temporary vertice for buiding triangles
    var aIndex = undefined;
    var bIndex = undefined;
    var cIndex = undefined;
    var dIndex = undefined;

    // part 2: building the triangles from the vertice
    for(var iy=0; iy<this.height - 1; iy++){

        for(var ix=0; ix<this.width - 1; ix++){

            // (0, 0)
            if(ix == 0 && iy == 0){
                aIndex = 0;
                bIndex = 1;
                cIndex = 2;
                dIndex = 3;

            //  (1, 0)
            }else if (ix == 1 && iy ==0) {
                aIndex = ix;
                bIndex = (ix * 2) + 2;
                cIndex = (ix * 2) + 3;
                dIndex = ((ix-1) * 2) + 2;

            // (0, 1)
            }else if (ix == 0 && iy == 1) {
                aIndex = 3;
                bIndex = 2;
                cIndex = this.firstRowSum + 1;
                dIndex = this.firstRowSum + 2;

            // (1, 1)
            }else if (ix == 1 && iy == 1) {
                aIndex = 2;
                bIndex = 5;
                cIndex = this.firstRowSum + 3;
                dIndex = this.firstRowSum + 1;

            // 1st row (except 1st col)
            }else if (iy == 0) {
                aIndex = ix * 2;
                bIndex = (ix * 2) + 2;
                cIndex = (ix * 2) + 3;
                dIndex = ((ix-1) * 2) + 3;

            // 2nd row (except 1st and 2nd col)
            }else if (iy == 1) {
                aIndex = (ix * 2) + 1;
                bIndex = (ix * 2) + 3;
                cIndex = this.firstRowSum + 2 + ix;
                dIndex = this.firstRowSum + 1 + ix;

            // 1st col (except 1st and 2nd row)
            }else if (ix == 0) {
                aIndex = this.firstRowSum + (iy - 2) * this.width + 2;
                bIndex = this.firstRowSum + (iy - 2) * this.width + 1;
                cIndex = this.firstRowSum + (iy - 1) * this.width + 1;
                dIndex = this.firstRowSum + (iy - 1) * this.width + 2;

            // 2nd col (except 1st and 2nd row)
            }else if (ix == 1) {
                aIndex = this.firstRowSum + (iy - 2) * this.width + 1;
                bIndex = this.firstRowSum + (iy - 2) * this.width + 3;
                cIndex = this.firstRowSum + (iy - 1) * this.width + 3;
                dIndex = this.firstRowSum + (iy - 1) * this.width + 1;

            // # all other cases
            }else{
                aIndex = this.firstRowSum + this.width * (iy - 2) + ix + 1;
                bIndex = this.firstRowSum + this.width * (iy - 2) + ix + 2;
                cIndex = this.firstRowSum + this.width * (iy - 1) + ix + 2;
                dIndex = this.firstRowSum + this.width * (iy - 1) + ix + 1;
            }

            var face1 = new THREE.Face3( aIndex, bIndex, cIndex );
            var face2 =  new THREE.Face3( aIndex, cIndex, dIndex );

            // getting a relevant color depending on altitude
            var altitude = Math.floor( ( this.geometry.vertices[aIndex].y ) * this._groundResolution + this.min );
            var altiColor = this.altitudeColorPicker2(altitude);

            if(typeof altiColor === "undefined"){
                console.log(altitude);
            }else{
                face1.color.setRGB(altiColor.r, altiColor.g, altiColor.b );
                face2.color.setRGB(altiColor.r, altiColor.g, altiColor.b );
            }

            // Add triangle T1, vertices a, b, c
            this.geometry.faces.push( face1 );

            // Add triangle T2, vertices a, c, d
            this.geometry.faces.push(face2);

        }

    }
}


// so that the shaped is in the center (and plays well with OrbitControl)
JsonDemLoader.prototype.adjustPosition = function(){
    //this.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( -(this.width / 2), 0, -(this.height / 2)) );
    this.geometry.translate(-(this.width / 2), 0, -(this.height / 2));
}


JsonDemLoader.prototype.getSceneWidth = function(){
    return this.width;
}


JsonDemLoader.prototype.getSceneHeight = function(){
    return this.height;
}


JsonDemLoader.prototype.getDemDeltaHeight = function(){
    return (this.max - this.min) ;
}


JsonDemLoader.prototype.getScaledDemDeltaHeight = function(){
    return (this.max - this.min) / this._groundResolution ;
}

JsonDemLoader.prototype.altitudeColorPicker = function(alti){

    var colorAltiLUT = {
        water: 0x09B2EB,
        plains: 0x94DB65,
        forest: 0x6CAD40,
        hightForest: 0x2E8025,
        tundra: 0xD7F58C,
        brownRocks: 0x805B05,
        greyRocks: 0xA8A8A8,
        icySnow: 0xE3EEFF,
        snow: 0xF2F7FF,
    }

    // water
    if(alti <= 10){
        return colorAltiLUT.water;
    }else if (alti <= 450) {
        return colorAltiLUT.plains
    }else if (alti <= 650) {
        return colorAltiLUT.forest;
    }else if (alti <= 1100) {
        return colorAltiLUT.hightForest;
    }else if (alti <= 1500) {
        return colorAltiLUT.tundra;
    }else if (alti <= 1900) {
        return colorAltiLUT.brownRocks;
    }else if (alti <= 2200) {
        return colorAltiLUT.greyRocks;
    }else if (alti <= 2500) {
        return colorAltiLUT.icySnow;
    }else{
        return colorAltiLUT.snow;
    }
}


JsonDemLoader.prototype.altitudeColorPicker2 = function(alti){

    var colorLUT = {
        water       : {r: 9,   g: 178, b: 235},
        sand        : {r: 250, g: 246, b: 147},
        plains      : {r: 148, g: 219, b: 101},
        forest      : {r: 108, g: 173, b: 64},
        hightForest : {r: 46,  g: 128, b: 37},
        tundra      : {r: 215, g: 245, b: 140},
        brownRocks  : {r: 128, g: 91,  b: 5},
        greyRocks   : {r: 168, g: 168, b: 168},
        icySnow     : {r: 227, g: 238, b: 255},
        snow        : {r: 255, g: 255, b: 255},
        ice         : {r: 225, g: 241, b: 255}
    }


    var altiLUT = {
        0    : "water",
        10   : "water",

        11   : "sand",
        25   : "sand",

        30   : "plains",
        450  : "plains",

        600  : "forest",
        680  : "forest",

        750  : "hightForest",
        1100 : "hightForest",

        1200 : "tundra",
        1550 : "tundra",

        1900 : "brownRocks",
        2100 : "brownRocks",

        2200 : "greyRocks",
        2350 : "greyRocks",

        2600 : "icySnow",
        3000 : "icySnow",

        3500 : "snow",
        6000 : "snow",

        7000 : "ice",
        9000 : "ice"

    }



    if(alti < 0)
        return colorLUT.water;

    var altiKeys = Object.keys(altiLUT);

    for(var k=0; k<altiKeys.length - 1; k++){

        var currentKey = parseInt(altiKeys[k]);
        var nextKey = parseInt(altiKeys[k+1]);

        if(alti >= currentKey && alti < nextKey){

            var percentFromCurrent = (alti - currentKey) / (nextKey - currentKey);
            // !!! The lower the percentage (alt distance to current), the MORE it takes this color!
            //var colorForAlti = Math.round( (1. - percentFromCurrent) * colorLUT[altiLUT[currentKey]] + percentFromCurrent * colorLUT[altiLUT[nextKey]] );

            var altiR =  ((1. - percentFromCurrent) * colorLUT[altiLUT[currentKey]].r + percentFromCurrent * colorLUT[altiLUT[nextKey]].r) / 255. ;

            var altiG =   ((1. - percentFromCurrent) * colorLUT[altiLUT[currentKey]].g + percentFromCurrent * colorLUT[altiLUT[nextKey]].g) / 255. ;

            var altiB =   ((1. - percentFromCurrent) * colorLUT[altiLUT[currentKey]].b + percentFromCurrent * colorLUT[altiLUT[nextKey]].b) / 255. ;

            /*
            console.log("---------------------------------------------------------");
            console.log("alti: " + alti);
            console.log("currentKey: " + currentKey);
            console.log("nextKey: " + nextKey);
            console.log("percentFromCurrent: " + percentFromCurrent);
            console.log("colorLUT[altiLUT[currentKey]: " + colorLUT[altiLUT[currentKey]]);
            console.log("colorLUT[altiLUT[nextKey]]: " + colorLUT[altiLUT[nextKey]]);
            console.log("colorForAlti: " + colorForAlti);
            console.log("altiLUT[currentKey]: " + altiLUT[currentKey]);
            console.log("altiLUT[nextKey]: " + altiLUT[nextKey]);


            console.log("---------------------------------------------------------");
            */
            return {r: altiR, g: altiG, b: altiB};


        }
    }


}
