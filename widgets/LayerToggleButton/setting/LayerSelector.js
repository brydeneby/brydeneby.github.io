///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
  'dijit/_WidgetBase',
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/query',
  'jimu/dijit/CheckBox',
  'dijit/_TemplatedMixin',
  'dojo/text!./LayerSelector.html',
  'dojo/dom-class',
  'dojo/dom-style',
  'dijit/registry'
], function(_WidgetBase, declare, lang, array, domConstruct, on, query,
  CheckBox, _TemplatedMixin, template,
  domClass, domStyle, registry) {

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: template,
    baseClass: 'layer-selector',
    _currentSelectedLayerRowNode: null,
    _displayStateStorage: null,

    postMixInProperties: function() {
      this.inherited(arguments);
      this._displayStateStorage = {};
    },

    postCreate: function() {
      array.forEach(this.operLayerInfos.getLayerInfoArray(), function(layerInfo) {
        this.drawListNode(layerInfo, 0, this.layerListTable);
      }, this);

      array.forEach(this.operLayerInfos.getTableInfoArray(), function(layerInfo) {
        this.drawListNode(layerInfo, 0, this.tableListTable);
      }, this);
    },

    drawListNode: function(layerInfo, level, toTableNode) {
      var nodeAndSubNode;
      if (layerInfo.newSubLayers.length === 0) {
        //addLayerNode
        nodeAndSubNode = this.addLayerNode(layerInfo, level, toTableNode);

        // don't add legend node, hide show legend image.
        domClass.add(query(".showLegend-div",
          nodeAndSubNode.currentNode)[0],
          'hidden');
        return;
      }
      //addLayerNode
      nodeAndSubNode = this.addLayerNode(layerInfo, level, toTableNode);
      array.forEach(layerInfo.newSubLayers, lang.hitch(this, function(level, subLayerInfo) {
        this.drawListNode(subLayerInfo, level + 1, nodeAndSubNode.subNode);
      }, level));
    },

    addLayerNode: function(layerInfo, level, toTableNode) {
      var layerTrNode = domConstruct.create('tr', {
          'class': 'jimu-widget-row layer-row ' +
            ( /*visible*/ false ? 'jimu-widget-row-selected' : ''),
          'layerTrNodeId': layerInfo.id
        }, toTableNode),
        layerTdNode, ckSelectDiv, ckSelect, imageTableDiv,
        popupMenuNode, i, imageShowLegendDiv, popupMenu, divLabel;

      layerTdNode = domConstruct.create('td', {
        'class': 'col col1'
      }, layerTrNode);

      for (i = 0; i < level; i++) {
        domConstruct.create('div', {
          'class': 'begin-blank-div jimu-float-leading',
          'innerHTML': ''
        }, layerTdNode);
      }

      imageShowLegendDiv = domConstruct.create('div', {
        'class': 'showLegend-div jimu-float-leading'
      }, layerTdNode);

      ckSelectDiv = domConstruct.create('div', {
        'class': 'div-select jimu-float-leading'
      }, layerTdNode);

      // if config has not been configured, default value is 'false'.
      // if config has been configured, but new layer of webmap is not in config file,
      //   default value is 'false'.
      var checkedValue = false;
      if(this.config.layerOptions && this.config.layerOptions[layerInfo.id] !== undefined) {
        checkedValue = this.config.layerOptions[layerInfo.id].display;
      }
      ckSelect = new CheckBox({
        checked: checkedValue,
        'class': "visible-checkbox-" + layerInfo.id
      });

      domConstruct.place(ckSelect.domNode, ckSelectDiv);

      // set tdNode width
      domStyle.set(layerTdNode, 'width', level * 12 + 35 + 'px');

      var layerTitleTdNode = domConstruct.create('td', {
        'class': 'col col2'
      }, layerTrNode);

      imageTableDiv = domConstruct.create('div', {
        'class': 'noLegend-div jimu-float-leading'
      }, layerTitleTdNode/*layerTdNode*/);
      if (layerInfo.isTable) {
        domClass.add(imageTableDiv, 'table');
      }
      if (layerInfo.isTable) {
        domStyle.set(imageTableDiv, 'display', 'block');
      }

      var layerTitleDivIdClass = 'layer-title-div-' + layerInfo.id;
      divLabel = domConstruct.create('div', {
        'innerHTML': layerInfo.title,
        'class':layerTitleDivIdClass + ' div-content jimu-float-leading '
      }, layerTitleTdNode);

      layerTdNode = domConstruct.create('td', {
        'class': 'col col3'
      }, layerTrNode);

      // add popupMenu
      popupMenuNode = domConstruct.create('div', {
        'class': 'layers-list-popupMenu-div'
      }, layerTdNode);

      //add a tr node to toTableNode.
      var trNode = domConstruct.create('tr', {
        'class': '',
        'layerContentTrNodeId': layerInfo.id
      }, toTableNode);

      var tdNode = domConstruct.create('td', {
        'class': '',
        'colspan': '3'
      }, trNode);

      var tableNode = domConstruct.create('table', {
        'class': 'layer-sub-node'
      }, tdNode);

      this.initDisplayStateStorage(layerInfo, ckSelect, divLabel);

      this.own(on(imageShowLegendDiv,
        'click',
        lang.hitch(this,
          this._onRowTrClick,
          layerInfo,
          imageShowLegendDiv,
          layerTrNode,
          tableNode)));

      this.own(on(layerTrNode,
        'mouseover',
        lang.hitch(this, this._onLayerNodeMouseover, layerTrNode, popupMenu)));
      this.own(on(layerTrNode,
        'mouseout',
        lang.hitch(this, this._onLayerNodeMouseout, layerTrNode, popupMenu)));
      this.own(on(ckSelect.domNode, 'click', lang.hitch(this,
        this._onCkSelectNodeClick,
        layerInfo,
        ckSelect)));

      return {
        currentNode: layerTrNode,
        subNode: tableNode
      };
    },

    // return current state:
    //   true:  fold,
    //   false: unfold
    _fold: function(layerInfo, imageShowLegendDiv, subNode) {
      /*jshint unused: false*/
      var state;
      if (domStyle.get(subNode, 'display') === 'none') {
        //unfold
        domStyle.set(subNode, 'display', 'table');
        domClass.add(imageShowLegendDiv, 'unfold');
        state = false; //unfold
      } else {
        //fold
        domStyle.set(subNode, 'display', 'none');
        var src;
        domClass.remove(imageShowLegendDiv, 'unfold');
        state = true; // fold
      }
      return state;
    },

    _onCkSelectNodeClick: function(layerInfo, ckSelect, evt) {
      /*jshint unused: false*/
      /*unselect all other layers/sublayers*/
      // this.clearSelectedLayers(layerInfo);
      layerInfo.traversal(lang.hitch(this, function(subLayerInfo) {
        this._grayedLayerLabel(subLayerInfo);
      }));
      evt.stopPropagation();
    },

    clearSelectedLayers: function(layerInfo){
      query('div[class^="jimu-checkbox visible-checkbox-"]').forEach(function(node){
        if(domClass.contains(node, "jimu-checkbox visible-checkbox-" + layerInfo.id)){
        }else{
          registry.byId(node.id).uncheck();
        }
      });
    },

    _onLayerNodeMouseover: function(layerTrNode, popupMenu) {
      domClass.add(layerTrNode, "layer-row-mouseover");
      if (popupMenu) {
        domClass.add(popupMenu.btnNode, "jimu-icon-btn-selected");
      }
    },

    _onLayerNodeMouseout: function(layerTrNode, popupMenu) {
      domClass.remove(layerTrNode, "layer-row-mouseover");
      if (popupMenu) {
        domClass.remove(popupMenu.btnNode, "jimu-icon-btn-selected");
      }
    },

    _onRowTrClick: function(layerInfo, imageShowLegendDiv, layerTrNode, subNode) {
      this._changeSelectedLayerRow(layerTrNode);
      this._fold(layerInfo, imageShowLegendDiv, subNode);
    },

    _changeSelectedLayerRow: function(layerTrNode) {
      if (this._currentSelectedLayerRowNode && this._currentSelectedLayerRowNode === layerTrNode) {
        return;
      }
      if (this._currentSelectedLayerRowNode) {
        domClass.remove(this._currentSelectedLayerRowNode, 'jimu-widget-row-selected');
      }
      domClass.add(layerTrNode, 'jimu-widget-row-selected');
      this._currentSelectedLayerRowNode = layerTrNode;
    },

    initDisplayStateStorage: function(layerInfo, displayCK, labelDiv) {
      this._displayStateStorage[layerInfo.id] = {
        displayCK: displayCK,
        labelDiv: labelDiv
      };
      this._grayedLayerLabel(layerInfo);
    },

    _grayedLayerLabel: function(layerInfo) {
      var display = true;
      var currentLayerInfo = layerInfo;
      var labelDiv = this._displayStateStorage[layerInfo.id].labelDiv;
      if(labelDiv) {
        while(currentLayerInfo) {
          display = display && this._displayStateStorage[currentLayerInfo.id].displayCK.checked;
          if(!display) {
            break;
          }
          currentLayerInfo = currentLayerInfo.parentLayerInfo;
        }
        if(!display) {
          domClass.add(labelDiv, 'grayed-title');
        } else {
          domClass.remove(labelDiv, 'grayed-title');
        }
      }
    },

    getLayerOptions: function() {
      var layerOptions = {};
      for(var child in this._displayStateStorage) {
        if(this._displayStateStorage.hasOwnProperty(child) &&
            (typeof this._displayStateStorage[child] !== 'function')) {
          layerOptions[child] = {display: this._displayStateStorage[child].displayCK.checked};
        }
      }
      return layerOptions;
    }

  });
});
