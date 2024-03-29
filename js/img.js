const canvasSize= $('#canvas_game').data('canvas-size');
var fileReader = new FileReader();
var canvas_game = new fabric.Canvas('canvas_game');
var uploadedImgWidth,
    uploadedImgHeight,
    app_id=$("meta[property='fb:app_id']").attr("content");
var apidata = {}; 
var isPictureHeight = false,isPictureWidth = false;
var extendPixel = 0;
var horizontalBorderLimit = 0; //水平邊界
var verticalBorderLimit = 0; //垂直邊界
var imageScale = 1;

// fb share-----
var canvas_share = new fabric.Canvas('canvas_share');
const fbShareCanvas_width = $('#canvas_share').width();
const fbShareCanvas_height = $('#canvas_share').height();
const fbShareUserPic_size = 580;
// const fbShareBgSrc = "/2016/nikki/photo0710/images/fbshare-bg.jpg";
var baseimage ;
// if(href.match(/^http:\/\/event.elle.com.tw/i)==null){
//   //測試機
//   app_id = 696667610471207;
// }else{
// //正式機
//   app_id = 548200988552737;
// }
console.log("canvasSize:"+canvasSize);

// include fb sdk---------------
$.ajaxSetup({
    cache: true
});

$.getScript('//connect.facebook.net/zh_TW/sdk.js', function() {
    FB.init({
        appId: app_id,
        cookie: true,
        version: 'v2.7'
    });

    $("#usefbPic").on("click", function(e) {
          FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                  apidata['uid'] = response.authResponse.userID;
                  FB.api('/me', {
                      fields: 'name,email'
                  }, function(response) {
                      apidata['name'] = response.name;
                      apidata['email'] = response.email;
                      // goStart(apidata);
                  });
            } else {
                  FB.login((function(response) {
                      if (response.status === 'connected') {
                          apidata['uid'] = response.authResponse.userID;
                          FB.api('/me', {
                              fields: 'name,email'
                          }, function(response) {
                              apidata['name'] = response.name;
                              apidata['email'] = response.email;
                              // goStart(apidata);
                          });
                        } else if (response.status === 'not_authorized') {
                            console.log('not_authorized');
                        } else {
                            console.log('need login');
                        }
                  }), {
                  scope: 'public_profile'
                  });
            }
            reqFbPic();
        });
        
    });
});

// $(".needusefb").on("click", function(){
//     reqFbPic();
// });    
function reqFbPic(){
  FB.api("/" + apidata['uid'] + "/picture?type=square&width=500&height=500", function(e) {
      InitialParam();
       var fbimg = new Image();
       fbimg.setAttribute('crossOrigin', 'anonymous');
       fbimg.src = e.data.url;
       fbimg.onload = function(e) {
        import_fbPic(fbimg);
      }
  })
}

// include fb sdk---------------

$( document ).ready(function() {
        canvas_game.on({
            'object:moving': function(e) {
              e.target.opacity = 0.5;
              var obj = e.target;
                obj.setCoords();     
                //top corner 
                if(obj.getBoundingRect().top < -verticalBorderLimit){
                    obj.top = Math.max(obj.top, obj.top-obj.getBoundingRect().top)-verticalBorderLimit;
                }
                // left corner
                if(obj.getBoundingRect().left < -horizontalBorderLimit){                    
                    obj.left = Math.max(obj.left, obj.left-obj.getBoundingRect().left)-horizontalBorderLimit;
                }
                //bottom corner
                if(obj.getBoundingRect().top+obj.getBoundingRect().height  > obj.canvas.height + verticalBorderLimit){
                    obj.top = Math.min(obj.top, obj.canvas.height-obj.getBoundingRect().height+obj.top-obj.getBoundingRect().top) + verticalBorderLimit;
                }
                //right corner
                if(obj.getBoundingRect().left+obj.getBoundingRect().width  > obj.canvas.width + horizontalBorderLimit){
                    obj.left = Math.min(obj.left, obj.canvas.width-obj.getBoundingRect().width+obj.left-obj.getBoundingRect().left) + horizontalBorderLimit;
                }            
               
            },
            'object:modified': function(e) {
              e.target.opacity = 1;
           }
        });      
        canvas_game.setOverlayImage('images/background.png', canvas_game.renderAll.bind(canvas_game));

        // 上傳照片============================================
        $('#uploadedImg').change(function(e) {         
          var flag = checkFileSize(event.target.files);
              if(!flag)
              {
                  alert("Please choose an image < 2MB.");
                  return;
              }else{
                  InitialParam();
                  importPicToCanvas(e.target.files[0]);
              }
          });

        $("#save").click(function(){
            // var myCanvas = document.querySelector('canvas');                
            var url = create_resultPic(true,canvas_game,0,0,canvasSize,canvasSize);
            sendImgToServer(url);
        }); 

  		$( "#slider" ).slider({				
    			range: "min",
    			min: 0,
    			max: 50,
    			value: 0,
    			slide: function(event, ui) {
        			$("#amount").val(ui.value);     
              var obj = canvas_game.getObjects()[0];              
              var Scale = (100 + ui.value) / 100;
              var changeWidth = uploadedImgwidth * Scale;
              var changeHeight = uploadedImgHeight * Scale;
              if(isPictureWidth){                
                obj.width = changeWidth;
                obj.height = changeHeight;
                horizontalBorderLimit = extendPixel + ((changeWidth - uploadedImgwidth) * imageScale);
                verticalBorderLimit = (changeHeight - uploadedImgHeight) * imageScale;
              }else if(isPictureHeight){               
                obj.width = changeWidth;
                obj.height = changeHeight;
                horizontalBorderLimit = ((changeWidth - uploadedImgwidth) * imageScale);
                verticalBorderLimit = extendPixel + ((changeHeight - uploadedImgHeight) * imageScale);
              }else{
                obj.width = changeWidth;
                obj.height = changeHeight;
                horizontalBorderLimit = ((changeWidth - uploadedImgwidth) * imageScale);
                verticalBorderLimit = ((changeHeight - uploadedImgHeight) * imageScale);
              }
              console.log(isPictureHeight);
              // console.log(obj.height + "/" + obj.width)
              // console.log(uploadedImgHeight + "/" + uploadedImgwidth)
              // console.log(verticalBorderLimit + "/" + horizontalBorderLimit)
              canvas_game.renderAll();      

  			}			
  		});
  		$("#amount").val( $("#slider").slider("value"));
});    
function create_resultPic(download_flag,canvas_box,x,y,width,height){
  var ctx = canvas_box.getContext ? canvas_box.getContext('2d') : null;
  var baseimage = new Image();
  ctx.drawImage(baseimage,x,y,width,height);    
  var dataURL = canvas_box.toDataURL("image/png");
  document.getElementById('canvasImg').src = dataURL;
  
  if(download_flag){
    imgDownload(dataURL);
  }
    apidata['user_result_pic'] = dataURL;
  return dataURL;
}
function create_resultPic_shareUse(canvas_box,x,y,width,height){
  var ctx = canvas_box.getContext ? canvas_box.getContext('2d') : null;
  var baseimage = new Image();
  ctx.drawImage(baseimage,x,y,width,height);    
  var dataURL = canvas_box.toDataURL("image/jpg");
  document.getElementById('canvasImg_share').src = dataURL;
    apidata['user_resultShare_pic'] = dataURL;
    // console.log("user_resultShare_pic:"+apidata['user_resultShare_pic']);
  return dataURL;
}
function initImg(){
    fabric.Image.fromURL('images/initimg.jpg', function(img) {
        img.set({
            left: 0,
            top: 0,            
            scaleX: canvasSize / img.width,
            scaleY: canvasSize / img.height,
            hasControls : false,
            hasBorders : false,
            //lockMovementX: true
        });
      uploadedImgHeight = img.height;
      uploadedImgwidth = img.width;
      canvas.add(img);
    });
}
function imgDownload(imgurl){
    //使用者下載 此方法在ios無效
    var link = document.createElement("a");
    link.href = imgurl;
    link.download = "mypainting.png";
    link.click();
}
  
function sendImgToServer(imgurl){
    // 鎖住該按鈕避免重複送出=====

     // 自動存放至路徑資料夾內
    $.ajax({
      type: "POST",
      url: "save.php",
      dataType: 'json',
      data: { 
         // imgBase64: dataURL
         base64: imgurl
      }
    }).done(function(o) {
      console.log('res:'+o.msg); 
      console.log('resImg:'+o.data.imgUrl); 
    });
}

function checkFileSize(obg){
    var filelist = obg;
    var str = "";
    var maxSize = $('#uploadedImg').data('max-size');
    for(var i = 0; i < filelist.length ; i++ ) {
        var file = filelist[i]
        str += "name：" + escape(file.name) + "\n" + //檔名
               "type：" + file.type + "\n" +  //檔案類型
               "size：" + file.size + "\n" +  //檔案大小
               "lastModifiedDate：" + file.lastModifiedDate.toLocaleDateString() + "\n\n\n"; //最後修改日期
    }
    console.log(str);
    if(file.size>=maxSize)
    {
      return false;
    }else{
      return true;
    }

}

function importPicToCanvas(target){
      canvasReset(canvas_game);
      fileReader.onload = function (event){
        var imgObj = new Image();
        imgObj.src = event.target.result;
        imgObj.onload = function () {
          var image = new fabric.Image(imgObj);          
          // 判斷傳進來的圖片是 直圖/橫圖/正方形圖
          if(image.width>image.height){
              imageScale = canvasSize / image.height;
              isPictureWidth = true;
              extendPixel = Math.round((image.width * imageScale) - canvasSize);
              horizontalBorderLimit = extendPixel;
          }else if(image.width<image.height){
              imageScale = canvasSize / image.width;
              isPictureHeight = true;
              extendPixel = Math.round((image.height * imageScale) - canvasSize); 
              verticalBorderLimit = extendPixel;
          }else{
            //image.width==image.height
              imageScale = canvasSize / image.height;
              isPictureWidth =false;
              isPictureHeight = false;
          }
          console.log(image.height+"/"+image.width);
          console.log(imageScale);
          console.log(extendPixel);
          image.set({
                left: 0,
                top: 0,            
                scaleX: imageScale,
                scaleY: imageScale,
                hasControls : false,
                hasBorders : false
          });
          uploadedImgHeight = image.height;
          uploadedImgwidth = image.width;
          canvas_game.centerObject(image);
          canvas_game.add(image);
          canvas_game.renderAll();
        }
      }
      fileReader.readAsDataURL(target);
      apidata['user_canvas_pic'] = imgObj;
}
function import_fbPic(imgObj){
      canvasReset(canvas_game); 
      var image = new fabric.Image(imgObj);
      // fb的圖片會是正方形的
     imageScale = canvasSize / image.height;
     isPictureWidth =false;
     isPictureHeight = false;
      image.set({       
            left: 0,
            top: 0,            
            scaleX: imageScale,
            scaleY: imageScale,
            hasControls : false,
            hasBorders : false
      });
      uploadedImgHeight = image.height;
      uploadedImgwidth = image.width;
      canvas_game.centerObject(image);
      canvas_game.add(image);
      canvas_game.renderAll();

       apidata['user_canvas_pic'] = imgObj;
}
function import_share(imgObj,x,y,scaleX,scaleY){
      // canvasReset(canvas_share); 
      var image = new fabric.Image(imgObj);
      // fb的圖片會是正方形的
     // imageScale = canvasSize / image.height;
     // isPictureWidth =false;
     // isPictureHeight = false;
      image.set({       
            left: x,
            top: y,            
            scaleX: scaleX,
            scaleY: scaleY,
            hasControls : false,
            hasBorders : false
      });
      uploadedImgHeight = image.height;
      uploadedImgwidth = image.width;
      //canvas_share.centerObject(image);
      canvas_share.add(image);
      canvas_share.renderAll();
}
function InitialParam(){
  isPictureHeight = false,isPictureWidth = false;
  extendPixel = 0;
  horizontalBorderLimit = 0; //水平邊界
  verticalBorderLimit = 0; //垂直邊界
  imageScale = 1;
  $("#amount").val(0);
  $("#slider").slider("value", 0);
}

function canvasReset(canvas_ele){
  var obj = canvas_ele.getObjects()[0];
    if (typeof obj !== "undefined") {
        obj.remove();
    } 
}
$("#reset").click(function(event) {
  canvasReset(canvas_game);
});

// var clear = function() {
//     canvas_share.clearRect(0, 0, canvasWidth, canvasHeight);
// };
var itemRender = function(src, x, y, width, height) {
    // canvas_share.drawImage(src, X, Y, width, height);
     create_resultPic_shareUse(canvas_share,x,y,width,height);
};

var itemsRender = function() {
    var i;
    i = 0;
    while (i < itemsAry.length) {
        if (itemsAry[i].src) {
            itemRender(itemsAry[i].src, itemsAry[i].X, itemsAry[i].Y, itemsAry[i].width, itemsAry[i].height);
        }
        i++;
    }
};

$("#fbShare").on("click", function() {

    // var url = create_resultPic(false,canvas_game,0,0,canvasSize,canvasSize);
    // sendImgToServer(url);
    var userimgurl = new Image();
    var backimgurl = new Image();
   
        // userimgurl.src = apidata['user_canvas_pic'];
        userimgurl = apidata['user_canvas_pic'];
        backimgurl.src = 'images/fbshare-bg.jpg';
        backimgurl.onload = function() {
          var bkScaleX=backimgurl.width / 2 / userimgurl.width;
          var bkScaleY=backimgurl.height / userimgurl.height; 
          import_share(backimgurl,0,0,1,1);
          import_share(userimgurl,0,0,bkScaleX,bkScaleY);
        };
        


    //canvasReset(canvas_share);

    // userimgurl.onload = function() {
        
       // canvas_share.setOverlayImage('images/fbshare-bg.jpg', canvas_share.renderAll.bind(canvas_share));

        // var url = create_resultPic_shareUse(canvas_share,20,20,fbShareUserPic_size,fbShareUserPic_size);
        // sendImgToServer(url);
      // 塞使用者圖片到分享圖背景 把目前使用者玩的進度存檔到server
        // itemsRender();
        // setTimeout(function() {
        //     var dataUrl = canvas_share.toDataURL('image/png');
        //     $.post('save.php', {
        //         base64: dataUrl
        //     }, (function(ret) {
        //         apidata['imgurlshare'] = ret.data.imgUrl;
        //         console.log(apidata['imgurlshare']);
        //         // if (isMobile()) {
        //         //     // $.post('api.php', {
        //         //     //     route: 'getusersession',
        //         //     //     data: apidata,
        //         //     // }, (function(ret) {
        //         //         var returnUrl = '%26imgurl%3D'+apidata['imgurl']+'%26constellation%3D'+constellation;
        //         //         var url = 'https://www.facebook.com/dialog/feed?app_id='+app_id+'&picture='+apidata['imgurlshare']+'&link='+location.href+'&redirect_uri='+location.href+'api.php?route=post_id'+ returnUrl +'&display=popup';
        //         //         location.href = url;
        //         //     // }), 'json');
        //         // } else {
        //         //     FB.ui({
        //         //         method: 'feed',
        //         //         link: location.href,
        //         //         picture: apidata['imgurlshare']
        //         //     }, function(response) {
        //         //         if (response && !response.error_code) {
        //         //             apidata['action'] = 'feed';
        //         //             apidata['post_id'] = response.post_id;
        //         //             if (response.post_id ){
        //         //                 FB.api( '/' + response.post_id, function( response ) {
        //         //                     apidata['message'] = response.message || '';
        //         //                     // request = $.ajax({
        //         //                     //     url: "post.php",
        //         //                     //     type: "POST",
        //         //                     //     dataType: "json",
        //         //                     //     data: apidata
        //         //                     // });
        //         //                     // request.done(function(r) {
        //         //                     //   if (r.success) {
        //         //                     //     alert(r.error);
        //         //                     //     //window.location.href = r.redirect;
        //         //                     //   } else {
        //         //                     //     alert('分享失敗');
        //         //                     //     //window.location.href = r.redirect;
        //         //                     //   }
        //         //                     // });
        //         //                     // request.fail(function(jqXHR, textStatus) {
        //         //                     //     alert('分享失敗');
        //         //                     // });
        //         //                 } );
        //         //             }
        //         //         } else{
        //         //             //AjaxLoadingRemove();
        //         //         }

        //         //     });
        //         // }

        //     }), 'json');
        // }, 500);
    // };
});