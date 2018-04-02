///////////////////////////////////////////////////////////////////////////
// Copyright © 2017 Robert Scheitlin. All Rights Reserved.
///////////////////////////////////////////////////////////////////////////

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'jimu/BaseWidget',
  'jimu/LayerInfos/LayerInfos',
  'jimu/WidgetManager',
  'dojo/query',
  'dojo/dom-class',
  'dojo/dom',
  'dijit/registry',
  'dojo/_base/html'
],
function(
    declare,
    lang,
    array,
    BaseWidget,
    LayerInfos,
    WidgetManager,
    query,
    domClass,
    dom,
    registry,
    html
  ) {
    var clazz = declare([BaseWidget], {
      name: 'LayerToggleButton',
      baseClass: 'widget-layertogglebutton',
      isToggling: false,
      operLayerInfos: null,
      toggleLayerIds: null,
      parentContainer: null,
      originalTitle: null,

      startup: function() {
        this.inherited(arguments);
        this.operLayerInfos = LayerInfos.getInstanceSync();
        this.setToggleLayer();
        var toggleBtnArr = query("div[data-widget-name='LayerToggleButton']");
        toggleBtnArr.forEach(lang.hitch(this, function(node){
          var parentWid = html.getAttr(node, 'widgetId');
          var widg = registry.byId(parentWid);
          if(widg.widget && widg.widget.config === this.config){
            this.parentContainer = node;
            var chkTitle = html.getAttr(node, 'title');
            this.originalTitle = chkTitle.replace(/(\: Off)|(\: On)/,'');
          }
        }));
      },

      setToggleLayer: function() {
        this.toggleLayerIds = [];
        Object.getOwnPropertyNames(this.config.layerOptions).forEach(lang.hitch(this, function(val) {
          if(this.config.layerOptions[val].display){
            this.toggleLayerIds.push(val);
          }
        }));
      },

      onOpen: function() {
        this.setToggleLayer();
        var lObjs = [];
        array.map(this.toggleLayerIds, lang.hitch(this, function(id){
          lObjs.push(this.operLayerInfos.getLayerInfoById(id));
        }));
        if (!this.isToggling) {
          this.isToggling = true;
          array.map(lObjs, lang.hitch(this, function(lObj){
            this.toggleLayer(lObj);
          }));
          setTimeout(lang.hitch(this, function() {
            this.isToggling = false;
            WidgetManager.getInstance().closeWidget(this);
            if(lObjs[0]._visible){
              domClass.add(this.parentContainer, "jimu-state-selected");
            }else{
              domClass.remove(this.parentContainer, "jimu-state-selected");
            }
          }), 300);
        }
      },

      toggleLayer: function(lObj) {
        var onOff = (lObj._visible) ? 'On' : 'Off';
        html.setAttr(this.parentContainer, 'title', this.originalTitle + ': ' + onOff);
        lObj.setTopLayerVisible(!lObj._visible);
      }
    });
return clazz;
});
