//Default value settings of private property
var useTab = is_getPropertyBoolean(useTab, true);

//Default value settings of public property
var commandQueueWait = is_getPropertyInt(commandQueueWait, 30);
var logCommandQueueWait = is_getPropertyInt(logCommandQueueWait, 3600);
var freshDays = is_getPropertyInt(freshDays, 1);
var refreshInterval = is_getPropertyInt(refreshInterval, 10);
var messagePriority = is_getPropertyInt(messagePriority, 1);
var portalStartDelayTime = is_getPropertyInt(portalStartDelayTime, 0);
var ajaxRequestTimeout = is_getPropertyInt(ajaxRequestTimeout, 15000);
var ajaxRequestRetryCount = is_getPropertyInt(ajaxRequestRetryCount,2);
var displayInlineHost = is_toUserPrefArray(is_getPropertyString(displayInlineHost, ""));
var accessLogEntry = is_getPropertyBoolean(accessLogEntry, false);

var sideMenuTabs = is_toUserPrefArray(is_getPropertyString(sideMenuTabs, "sidemenu|addContent|mySiteMap"));

var hostPrefix = (isTabView)? findHostURL(false).replace(/\/tab.*/, "") : findHostURL(false);
var proxyServerURL = hostPrefix + "/proxy";

var searchEngineURL = searchEngineURL || localhostPrefix+"/schsrv";

IS_Customization = false;
IS_WidgetConfiguration = [];
IS_Portal.logoffDateTime = -1;
IS_Portal.fontSize = "";
IS_Portal.msgLastViewTime = -1;

IS_Portal.freshDays = freshDays;
IS_Portal.thema = "default";
//IS_Portal.sidePanel = new Object();
IS_Portal.buildVersion = "";
IS_Portal.lastSaveFailed = false;

IS_Portal.autoRefCountList = [];
IS_Request.CommandQueue = new IS_Request.Queue("/comsrv", commandQueueWait, !is_userId);
IS_Request.LogCommandQueue = new IS_Request.Queue("/logsrv", logCommandQueueWait, false, true);
IS_Portal.imageController = {};//For image thumbnail. Refer to RssItemRender.js
IS_Portal.iframeToolBarIconsTable;
var IS_User = new Object();

IS_Portal.defaultFontSize = "100%";

IS_Portal.start = function() {
	var self = this;

	IS_Portal.startIndicator();
	
	var fontSize = getActiveStyle( document.body, "font-size");
	IS_Portal.defaultFontSize = (fontSize.charAt(fontSize.length-1)=="%" ? fontSize : Math.round(parseInt(fontSize)/16*100) + "%" );
	
	var opt = {
	  method: 'get' ,
	  asynchronous:false,
	  onSuccess: function(response){
		  eval(response.responseText);
	  },
	  onFailure: function(t) {
		  alert('Retrieving customization info failed. ' + t.status + ' -- ' + t.statusText);
	  },
	  onExcepti: function(t) {
		  alert('Retrieving customization info failed. ' + t);
	  }
	};	
	AjaxRequest.invoke(hostPrefix +  "/customization", opt);
	
	document.title = IS_Customization.title;

	var header = document.getElementById("portal-header");
	header.innerHTML = IS_Customization.header;

	var command = document.getElementById("portal-command");
	command.innerHTML = IS_Customization.commandbar;
	IS_Portal.buildFontSelectDiv();
	IS_Portal.buildPortalPreference();
	IS_Portal.Trash.initialize();
	IS_Portal.buildAdminLink();
	IS_Portal.buildCredentialList();
	IS_Portal.buildLogout();
	
	IS_Portal.buildTabs();
	new IS_WidgetsContainer();
	new IS_SiteAggregationMenu();
	IS_Portal.sidePanel = new IS_SidePanel();
	IS_Portal.refresh = new IS_AutoReload();
	
	var divSiteMenu = $("portal-site-aggregation-menu");
	Event.observe(window, 'resize', IS_Portal.adjustSiteMenuHeight, false);
	Event.observe(window, 'resize', IS_Portal.adjustIframeHeight, false);
	Event.observe(window, 'resize', IS_Portal.adjustGadgetHeight , false);


	var messageBarDiv = $('message-bar-controles');
	var messageMoreBtn = document.createElement('input');
	messageMoreBtn.id = 'message-list-more-btn';
	messageMoreBtn.type='button';
	messageMoreBtn.style.display = 'none';
	messageMoreBtn.value = IS_R.lb_messageMore;
	messageBarDiv.appendChild(messageMoreBtn);
	Event.observe(messageMoreBtn, 'click', IS_Portal.moreMsgBar, false);
	var messageBarCloseBtn = document.createElement('input');
	messageBarCloseBtn.type='button';
	messageBarCloseBtn.value = IS_R.lb_messageClose;
	messageBarDiv.appendChild(messageBarCloseBtn);
	Event.observe(messageBarCloseBtn, 'click', IS_Portal.closeMsgBar, false);

	IS_Portal.behindIframe.init();
	
	Event.observe($("ifrm"), "load", IS_Portal.iFrameOnLoad, false);
		
	Event.observe( document.body, 'mousedown', IS_Widget.RssReader.RssItemRender.checkHideRssDesc, false );
	
	var panelBody = document.body;
	
	IS_Portal.droppableOption = {};
	
	//widget to panel
	var widopt = {};
//	widopt.accept = ["widget", "subWidget"];
	widopt.accept = function(element, widgetType, classNames){
		return (classNames.detect( 
          function(v) { return ["widget", "subWidget"].include(v) } ) &&
 			(widgetType != "mapWidget") );
	};
	widopt.onHover = IS_DroppableOptions.onHover;
	widopt.onDrop = function(element, lastActiveElement, widget, event) {
		var widgetGhost = IS_Draggable.ghost;
		if( !Browser.isSafari ||( widgetGhost && widgetGhost.style.display != "none")){
			var ghostColumnNum = (widgetGhost.col)? widgetGhost.col.getAttribute("colNum"):1;
			widget.widgetConf.column = ghostColumnNum;
			widgetGhost.col.replaceChild(element, widgetGhost);
		} else {
		    widgetGhost.col.removeChild( widgetGhost );
		}
		element.style.position = "";

		var tmpParent =false;
		if(widget.parent){// If sub widget is dropped on the panel.
			element.className="widget";
			widget.tabId = IS_Portal.currentTabId;

			tmpParent = widget.parent;
			IS_Portal.removeSubWidget(widget.parent.id, widget.id);
			//widget.parent.content.removeRssReader(widget.id, false, true);
			//The item deleted from Multi is not removeWidget but setWidgetLocationCommand.
			IS_EventDispatcher.newEvent("applyIconStyle", widget.id);
			IS_EventDispatcher.newEvent("changeConnectionOfWidget", widget.id);
			IS_EventDispatcher.newEvent("applyIconStyle", tmpParent.id);
			
			tmpParent.content.mergeRssReader.isComplete = false;
		}
		
		//Send to Server
		IS_Widget.setWidgetLocationCommand(widget);

		if(tmpParent)
			tmpParent.content.checkAllClose(true);
		
		// TODO: Processing of removing edit tip of title. Processing should be within WidgetHeader
		if(widget.headerContent && widget.headerContent.titleEditBox){
			widget.headerContent.titleEditBox.style.display = "none";
		}
		
		if( widget.isGadget()) {
			if( Browser.isIE ) {
				IS_Portal.adjustGadgetHeight( widget,true );
			} else {
				widget.loadContents();
			}
		}
		
		IS_EventDispatcher.newEvent("moveWidget", widget.id);
	};
	IS_Droppables.add(panelBody, widopt);
	
	//menuItem to panel
	var menuopt = {};
	menuopt.accept = "menuItem";
	menuopt.onDrop = function(element, lastActiveElement, menuItem, event) {
		var widgetGhost = IS_Draggable.ghost;
		var ghostColumnNum = (widgetGhost.col)? widgetGhost.col.getAttribute("colNum"):1;
		
		var parentItem = menuItem.parent;
		var p_id;
		var divParent;
		
		if(parentItem){
			p_id = IS_Portal.currentTabId+"_p_" + parentItem.id;
			divParent = $(p_id);
		}

		var widgetConf;
		var subWidgetConf;
		if(/MultiRssReader/.test(menuItem.type)){
			if(!divParent){
				// TODO: Processing of cooperative menu
				var parentItem = menuItem.parent;
				var w_id = IS_Portal.currentTabId + "_p_" + parentItem.id;

				var childMenuList = [];
				var children = parentItem.children;
				for(var i = 0; i < children.length ;i++){
					var feedNode = children[i];
					if(feedNode.type && /MultiRssReader/.test(feedNode.type)){
						childMenuList.push(feedNode.id);
					}
				}
				if(!parentItem.properties)parentItem.properties = [];
				parentItem.properties.children = childMenuList;

				parentItem.properties["itemDisplay"] = parentItem["display"];
				widgetConf = IS_WidgetsContainer.WidgetConfiguration.getConfigurationJSONObject(
					"MultiRssReader", w_id, ghostColumnNum, parentItem.title, parentItem.href, parentItem.properties);
				
				subWidgetConf = IS_WidgetsContainer.WidgetConfiguration.getFeedConfigurationJSONObject(
								"RssReader", "w_" + menuItem.id, menuItem.title, menuItem.href, "false", menuItem.properties);
				subWidgetConf.menuId = menuItem.id;
				subWidgetConf.parentId = "p_" + menuItem.parentId;
			}
		}else{
			/* Recreate config everytime becasue menu can be changed */
			// Create JSONObject from menuItem
			widgetConf = IS_SiteAggregationMenu.getConfigurationFromMenuItem(menuItem, ghostColumnNum);
		}
		
		var widget;
		if(/MultiRssReader/.test(menuItem.type) && divParent){//Drop cooperative menu from menu
			var parentItem = menuItem.parent;
//			var targetWidget = IS_Portal.widgetLists[IS_Portal.currentTabId][p_id];
			var targetWidget = IS_Portal.getWidget(p_id, IS_Portal.currentTabId);
			
			// Head at order display of time.
			var siblingId;
			var nextSiblingId;
			if(targetWidget.getUserPref("displayMode") == "time"){
				siblingId = "";
				nextSiblingId = "";
			}else{
				siblingId = (widgetGhost.previousSibling) ? widgetGhost.previousSibling.id : "";
				nextSiblingId = (widgetGhost.nextSibling) ? widgetGhost.nextSibling.id : "";
			}
			var w_id = "w_" + menuItem.id;
//			menuItem.type="RssReader";
			var widgetConf = IS_SiteAggregationMenu.getConfigurationFromMenuItem(menuItem, ghostColumnNum);
			widgetConf.type = "RssReader";
			
			/*
			var dummyWidget = {};
			dummyWidget.widgetConf = widgetConf;
			
			widget = targetWidget.content.addRssReader(dummyWidget, siblingId);
			*/
//			var divWidgetDummy = element.dummy;
//			element = divWidgetDummy.parentNode.replaceChild(element, divWidgetDummy);
//			element.style.top = "0px";
//			element.style.width = "auto";
			
			/*
			//Send to Server
			IS_Widget.setWidgetLocationCommand(widget);
			*/
			
			// subWidget in the same tab is always built
			var currentTabId = IS_Portal.currentTabId;
			if( Browser.isSafari1 && targetWidget.content.isTimeDisplayMode())
				IS_Portal.currentTabId = "temp";
			
			widgetConf.parentId = "p_" + menuItem.parentId;
			widget = IS_WidgetsContainer.addWidget( currentTabId, widgetConf , true, function(w){
				w.elm_widget.className = "subWidget";
				widgetGhost.parentNode.replaceChild(w.elm_widget, widgetGhost);
			});//TODO: The way of passing sub widget.
			
			IS_Portal.widgetDropped( widget );
			
			if( Browser.isSafari1 && targetWidget.content.isTimeDisplayMode())
				IS_Portal.currentTabId = currentTabId;
			
			//Send to Server
			//IS_Widget.addWidgetCommand(widget);
			//IS_Widget.setWidgetLocationCommand(widget);
			
//			IS_Portal.subWidgetMap[targetWidget.id].push(widget.id);
			IS_Portal.addSubWidget(targetWidget.id, widget.id);
			targetWidget.content.addSubWidget(widget, nextSiblingId);
			if(widget.isBuilt)widget.blink();
			
			//Send to Server
			IS_Widget.setWidgetLocationCommand(widget);

			if( targetWidget.content.isTimeDisplayMode() ) {
				IS_EventDispatcher.addListener("loadComplete",targetWidget.id,function() {
					targetWidget.elm_widgetBox.className = "widgetBox";
					targetWidget.headerContent.applyAllIconStyle();
				},null,true );
				
				targetWidget.loadContents();
			}
		}else{
			addWidgetFunc( IS_Portal.currentTabId,widgetGhost );
		}
		
		function addWidgetFunc( tabId,target ) {
			widget = IS_WidgetsContainer.addWidget( tabId, widgetConf , false, function(w){
					target.parentNode.replaceChild( w.elm_widget,target );
				}, (subWidgetConf)? [subWidgetConf] : null);//TODO: The way of passing sub widget.
//			var divWidgetDummy = element.dummy;
//			element = divWidgetDummy.parentNode.replaceChild(element, divWidgetDummy);
//			element.style.top = "0px";
//			element.style.width = "auto";
			
			//Send to Server
			IS_Widget.setWidgetLocationCommand(widget); //Add SiblingId
			
			var menuId;
			if(/MultiRssReader/.test(menuItem.type)){
				var subWidgets = IS_Portal.getSubWidgetList(widget.id);
				for (var i=0; i < subWidgets.length; i++){
					var feedWidget = subWidgets[i];
					if(feedWidget)
						IS_Portal.widgetDropped( feedWidget );
				}
			}else{
				IS_Portal.widgetDropped( widget );
			}
		}
	}
	menuopt.onHover = function(element, dropElement, dragMode, point) {
		var widgetGhost = IS_Draggable.ghost;
		if(widgetGhost.menuItem && /MultiRssReader/.test(widgetGhost.menuItem.type)){
			var parentItem = widgetGhost.menuItem.parent;
			var p_id = IS_Portal.currentTabId+"_p_" + parentItem.id;
			var divParent = $(p_id);
			if( divParent ) return;
		}
		
		var x = point[0] - element.boxLeftDiff;
		var y = point[1] - element.boxTopDiff;

		var min = 10000000;
		var nearGhost = null;
		for ( var i=1; i <= IS_Portal.tabs[IS_Portal.currentTabId].numCol; i++ ) {
			var col = IS_Portal.columnsObjs[IS_Portal.currentTabId]["col_dp_" + i];
			for (var j=0; j<col.childNodes.length; j++ ) {
				var div = col.childNodes[j];
				if (div == widgetGhost) {
					continue;
				}
				
				if(dragMode == "menu"){
					var left = findPosX(div);
					var top = findPosY(div);
				}else{
					var left = div.posLeft;
					var top = div.posTop;
				}
				
				var tmp = Math.sqrt(Math.pow(x-left,2)+ Math.pow(y-top,2));
				if (isNaN(tmp)) {
					continue;
				}
				
				if ( tmp < min ) {
					min = tmp;
					nearGhost = div;
					nearGhost.col = col;
				}
				
			}
		}
		if (nearGhost != null && widgetGhost.nextSibling != nearGhost) {
			widgetGhost.style.display = "block";
			nearGhost.parentNode.insertBefore(widgetGhost,nearGhost);
			widgetGhost.col = nearGhost.col;
		}

	}
	
	IS_Droppables.add(panelBody, menuopt);
	
	// multidrop to panel
	var multimenuopt = {};
	multimenuopt.accept = ["menuGroup", "multiDropHandle"];
	multimenuopt.onHover = IS_DroppableOptions.onHover;
	
	IS_Portal.droppableOption.onMultiMenuDrop = function(element, lastActiveElement, menuItem, event, originFunc, modalOption){
		var confs = IS_SiteAggregationMenu.createMultiDropConf.call(self, element, lastActiveElement, menuItem, event, IS_Portal.droppableOption.onMultiMenuDrop, modalOption);
		
		var widgetGhost = IS_Draggable.ghost;
		element.style.display = "none";
//		var divWidgetDummy = element.dummy;
//		element.dummy = false;
//		if(divWidgetDummy && divWidgetDummy.parentNode){
//			element = divWidgetDummy.parentNode.replaceChild(element, divWidgetDummy);
//			element.style.top = "0px";
//			element.style.width = "auto";
//		}
		
		if( !isUndefined("siteAggregationMenuURL")&& menuItem.owner == IS_TreeMenu.types.topmenu ) {
			IS_SiteAggregationMenu.closeMenu();
			IS_SiteAggregationMenu.resetMenu();
		}
		
		if(confs){
			var widgetConf = confs[0];
			var subWidgetConfList = confs[1];
			var otherWidgets = confs[2];
			var sibling = widgetGhost;
			
			if(widgetConf && subWidgetConfList.length > 0) {
				var widget = IS_WidgetsContainer.addWidget( IS_Portal.currentTabId, widgetConf , false, function(w){
						widgetGhost.col.replaceChild(w.elm_widget, widgetGhost);
					},subWidgetConfList);
				
	//			var hasCurrentTab = IS_Portal.widgetLists[IS_Portal.currentTabId][IS_Portal.currentTabId + "_p_" + menuItem.id];
				var hasCurrentTab = IS_Portal.getWidget(IS_Portal.currentTabId + "_p_" + menuItem.id);
				if(hasCurrentTab && modalOption == IS_SiteAggregationMenu.MergeMode.remain && widget.headerContent){
	//				widget.headerContent.showTitleEditorForm();
	//TODO !! No editor
				}
				
				//Send to Server
				IS_Widget.setWidgetLocationCommand(widget);
				//var menuId;
				if(widget.content && widget.content.getRssReaders){
					var rssReaders = widget.content.getRssReaders();
					for(var i = 0; i < rssReaders.length; i++){
						//if(widget.content.isDisplay(rssReaders[i])){
							menuId = IS_Portal.getTrueId(rssReaders[i].id, rssReaders[i].widgetType).substring(2);
							if(!IS_Portal.isChecked(menuId))
								IS_Portal.widgetDropped( rssReaders[i] );
						//}
					}
				}else{
					//menuId = IS_Portal.getTrueId(widget.id, widget.widgetType).substring(2);
					IS_Portal.widgetDropped( widget );
				}
				sibling = widget.elm_widget;
			}
			otherWidgets.each(function(otherMenuItem){
				var ghostColumnNum = (widgetGhost.col)? widgetGhost.col.getAttribute("colNum"):1;
				var otherWidgetConf = IS_SiteAggregationMenu.getConfigurationFromMenuItem(otherMenuItem, ghostColumnNum);
				var target = widgetGhost;
				if(sibling != widgetGhost) {
					target = document.createElement("div");
					sibling.parentNode.insertBefore(target, sibling.nextSibling ? sibling.nextSibling : sibling);
				}
				addWidgetFunc( IS_Portal.currentTabId, target );
				function addWidgetFunc( tabId,target ) {
					var otherWidget = IS_WidgetsContainer.addWidget( tabId, otherWidgetConf , false, function(w){
							target.parentNode.replaceChild( w.elm_widget,target );
						}, null);
					IS_Widget.setWidgetLocationCommand(otherWidget); //Add SiblingId
					IS_Portal.widgetDropped( otherWidget );
					sibling = otherWidget.elm_widget;
				}
			});
		}
	}
	multimenuopt.onDrop = IS_Portal.droppableOption.onMultiMenuDrop;
	
	IS_Droppables.add(panelBody, multimenuopt);
	
	IS_Draggables.keyEvent.keyPressed = false;
	IS_Draggables.keyEvent.addKeyDownEvent(
		function(e){
			if(IS_Draggables.keyEvent.isPressing.ctrl){
				var widgetGhost = IS_Draggable.ghost;
				
//				if (IS_Draggables.activeDraggable && !IS_Draggables.keyEvent.keyPressed) {
//					IS_Droppables.show(IS_Draggables._lastPointer, IS_Draggables.activeDraggable.element);
//					IS_Draggables.keyEvent.keyPressed = true;
//				}
				
				if (IS_Draggables.activeDraggable && IS_Draggables.activeDraggable.element){
					var element = IS_Draggables.activeDraggable.element;
					IS_Droppables.findDroppablesPos(element);
					IS_Droppables.show(IS_Draggables._lastPointer, element);
				}

				if (widgetGhost) {
					//widgetGhost.oldBorderStyle = getStyleValue("#widgetGhost", "border");
					Element.addClassName( widgetGhost,"noMergeMode");
				}
			}
		}
	);
	
	IS_Draggables.keyEvent.addKeyUpEvent(
		function(e){
			if(!IS_Draggables.keyEvent.isPressing.ctrl){
				if (IS_Draggables.activeDraggable && IS_Draggables.activeDraggable.element)
					IS_Droppables.findDroppablesPos(IS_Draggables.activeDraggable.element);
				var widgetGhost = IS_Draggable.ghost;
				if(widgetGhost) {
				//	widgetGhost.style.border = "2px dashed #F00";
					Element.removeClassName( widgetGhost,"noMergeMode");
				}
// 				IS_Draggables.keyEvent.keyPressed = false;
			}
		}
	);
	//IS_Portal.startDetectFontResized();
	
	if(is_userId)
		IS_Portal.checkSystemMsg();
}

IS_Portal.getFreshDays = function(_freshDays){
	// Find out business day
	var cal = new Date();
	for(var i=0;i<_freshDays;i++){
		cal.setDate(cal.getDate() - 1);
		if(isHoliday(cal) || cal.getDay() == 0	|| cal.getDay() == 6){
			_freshDays++;
		}
		
		if(_freshDays > 20) break;
	}
	
	function isHoliday(cal) {
		year = cal.getFullYear();
		month = cal.getMonth() + 1;
		IS_Holiday.computeEvents(year, month);
		var ev = IS_Holiday.getEvent(cal);
		
		return ev.length > 0;
	}

	return _freshDays;
}

IS_Portal.closeIFrame = function () {
	if(!(Element.visible('portal-iframe') || Element.visible('search-iframe')))return;
	
	var iframeTag = $("ifrm");
	if(iframeTag) iframeTag.src = "";
	var divIFrame = $("portal-iframe");
	if ( divIFrame ) {
		divIFrame.style.display = "none";
	}
	
	var divIFrame = $("search-iframe");
	if ( divIFrame ) {
		divIFrame.style.display = "none";
	}
	
	var ifrmURL = $("portal-iframe-url");
	ifrmURL.style.display = "none";
	
	var divIS_PortalWidgets = document.getElementById("panels");
	if ( divIS_PortalWidgets) {
		divIS_PortalWidgets.style.display="";
	}
	var iframeToolBar = document.getElementById("iframe-tool-bar");
	iframeToolBar.style.display = "none";
	
	IS_Event.unloadCache("_search");
	
	//Clear iframe in IS_Portal.searchEngines
	var sIframe;
	for(var i = 0; i < IS_Portal.searchEngines.length; i++){
		sIframe = IS_Portal.searchEngines[i].iframe;
		if(sIframe) sIframe.src = "";
	}
	
//	IS_WidgetsContainer.adjustColumnWidth();
	IS_Widget.adjustDescWidth();
	IS_Widget.Information2.adjustDescWidth();
	//Display ifame at link icon in only IE and layout is broke up if go back.
	//TODO Should be removed
	IS_Widget.Maximize.adjustMaximizeWidth();
	IS_Widget.WidgetHeader.adjustHeaderWidth();
	
	IS_Portal.SearchEngines.clearTemp();
	
	//Refresh immidiately if auto refresh is worked while iframe is displayed
	IS_Portal.refresh.resume();
	
//	IS_Portal.setFontSize();
	IS_Portal.adjustIS_PortalStyle();
};

if( Browser.isSafari1 ) {
	IS_Portal.closeIFrame = ( function() {
		var closeIFrame = IS_Portal.closeIFrame;
		
		return function() {
			if( IS_Portal.currentTabId.indexOf("_") != 0 || IS_Widget.MaximizeWidget )
				return;
			
			IS_Portal.currentTabId = IS_Portal.currentTabId.substring(1);
			closeIFrame.apply( this,$A( arguments ));
			
			IS_Portal.enableCommandBar();
			IS_Portal.adjustCurrentTabSize();
		}
	})();
}

IS_Portal.goHome = function(){
	IS_Portal.closeIFrame();
	IS_Portal.CommandBar.changeDefaultView();
}

//TODO:This code depend to MultiRssReader.
IS_Portal.isChecked = function(menuItem){
	isChecked = false;
	
	for(var tabId in IS_Portal.widgetLists){
		var widgetList = IS_Portal.widgetLists[tabId];
		for(var i in widgetList){
			if(!widgetList[i] || !widgetList[i].id) continue;
			
			if (/MultiRssReader/.test(widgetList[i].widgetType)) {
				if(!widgetList[i].isBuilt){
					// Judge subWidget by refering inside the feed if not build yet.
					var feed = widgetList[i].widgetConf.feed;
					for(var j in feed){
						var check = (feed[j].id && (feed[j].id.substring(2) == menuItem.id)
								&& (feed[j].property.relationalId != IS_Portal.getTrueId(widgetList[i].id) || feed[j].isChecked));
						if(/true/i.test(check)){
							isChecked = true;
							break;
						}
					}
				}
			}else{
				if(widgetList[i].id.substring(2) == menuItem.id){
					isChecked = true;
					break;
				}
			}
		}
	}
	return isChecked;
}

/**
 * Search and return Widget existing in portal by MenuID(no w_)
 * Return null if not existing.
 * 
 * @param {Object} widgetId
 */
IS_Portal.searchWidgetAndFeedNode = function(menuId){
	var widget = null;
	
	tabLoop:
	for(var tabId in IS_Portal.widgetLists){
		var widgetList = IS_Portal.widgetLists[tabId];
		for(var i in widgetList){
			if(!widgetList[i] || !widgetList[i].id) continue;
			
			if(widgetList[i].id.substring(2) == menuId){
				widget = widgetList[i];
				break tabLoop;
			}
		}
	}
	return widget;
}

IS_Portal.getProperty = function(properties, attrName) {
	var value;
	var prop = getChildrenByTagName(properties, "property");
	for ( i=0; i<prop.length; i++ ) {
		var property = prop[i];
		var name = property.getAttribute("name");
		var value = (property.firstChild) ? property.firstChild.nodeValue : "";
		if (name == attrName) {
			break;
		}
	}
	return value;
}

IS_Portal.getPropertys = function(properties, feed) {
	var prop = getChildrenByTagName(properties, "property");
	for ( i=0; i<prop.length; i++ ) {
		var property = prop[i];
		var name = property.getAttribute("name");
		feed[name] = (property.firstChild) ? property.firstChild.nodeValue : "";
	}
}

IS_Portal.adjustSiteMenuHeight = function(e, siteManuObj) {
	var siteManuObj = document.getElementById("portal-maincontents-table");
	if(siteManuObj) {
		var adjustHeight = getWindowSize(false) - findPosY(siteManuObj) - 5;
		if (Browser.isIE) adjustHeight -= 15;
		if (adjustHeight>=0) siteManuObj.style.height = adjustHeight + "px";
		return;
	}
}

IS_Portal.adjustIframeHeight = function(e, iframeObj) {
	var iframe = iframeObj;
	if(!iframe){
		var searchResult = document.getElementById("search-result");
		if(searchResult){
			var searchIframes = searchResult.getElementsByTagName("iframe");
			for ( i = 0; i < searchIframes.length; i++) {
				var disp = getDisplay(searchIframes[i]);
				if(disp) {
					iframe = searchIframes[i];
					break;
				}
			}
		}
		
		if(!iframe){
			var contentIframe = document.getElementById("ifrm");
			if(contentIframe && getDisplay(contentIframe)){
				iframe = contentIframe;
			}
		}
	}
	
	if(iframe && iframe.id) {
		try{
//			var adjustHeight = getWindowSize(false) - findPosY(iframe) - 10;
			var iframeToolBar = document.getElementById("iframe-tool-bar");
			var offset = ( iframeToolBar && iframeToolBar.style.display != "none") ? iframeToolBar.offsetHeight : 0;
			var adjustHeight = getWindowSize(false) - findPosY(iframe) - offset - 10 -(Browser.isFirefox ? 10:0);

			iframe.style.height = adjustHeight + "px";
		}catch(e){
			msg.warn(IS_R.getResource(IS_R.ms_errorOnWindowResize,[e]));
		}
		return;
	}
	
	//TODO:Function name is not obvious
	function getDisplay(obj) {
		if(obj.style && obj.style.display == 'none')
			return false;
		else if(obj.parentNode)
			return getDisplay(obj.parentNode);
		return true;
	}
}

IS_Portal.deleteCache = function() {
	var opt = {
		method: 'get' ,
		asynchronous:true,
		onSuccess: function(req){},
		onFailure: function(t) {
			msg.warn(IS_R.getResource(IS_R.ms_cacheDeleteFailure,[t.status,t.statusText]));
		}
	};
	AjaxRequest.invoke(hostPrefix +  "/cacsrv?delete=", opt);
}

IS_Portal.deleteCacheByUrl = function(url) {
	var opt = {
		method: 'post' ,
		postBody: "delete=&url=" + encodeURIComponent(url),
		asynchronous:true,
		onSuccess: function(req){},
		onFailure: function(t) {
			msg.warn(IS_R.getResource(IS_R.ms_cacheDeleteFailure,[t.status,t.statusText]));
		}
	};	
	AjaxRequest.invoke(hostPrefix +  "/cacsrv", opt);
}

IS_Portal.processLogoff = function(){
	var cmd = new IS_Commands.ExecLogoffProcessCommand();
	IS_Request.CommandQueue.addCommand(cmd);
}

var widgetGhost = document.createElement("div");
widgetGhost.id = "widgetGhost";

var debugConsol = document.getElementById("debugConsole");

if(!isTabView){
	Event.observe(window, 'load', function() {
		if(portalStartDelayTime > 0){
			$('portal-site-aggregation-menu').innerHTML = IS_R.ms_infosccopInitializing;
			setTimeout(IS_Portal.start, portalStartDelayTime);
		}else{
			IS_Portal.start();
		}
		IS_Portal.deleteCache();//TODO:Should be delted at calling index.jsp
	});
}

Event.observe(window, 'unload',  windowUnload );

function windowUnload() {
	IS_Request.asynchronous = false;

	//Send to Server
	try{
		IS_Portal.processLogoff();
	}catch(e){
		alert(IS_R.getResource(IS_R.ms_logofftimeSavingfailure,[getText(e)]));
	}
	
	try{
		IS_Request.LogCommandQueue.fireRequest();
	}catch(e){}
	
	try{
		IS_Request.CommandQueue.fireRequest();
	}catch(e){
		alert(IS_R.getResource(IS_R.ms_customizeSavingFailure1,[getText(e)]));

	}
	
	//Event.unloadCache();
	// Cache is deleted on loading
	if( !Browser.isSafari1 )
		IS_Portal.deleteCache();
	
	for ( var id in IS_Portal.widgetLists){
		for ( var i in IS_Portal.widgetLists[id] ) {
//			IS_Portal.widgetLists[id][i] = null;
			IS_Portal.removeWidget(i, id);
		}
	}
	for ( var i in IS_Widget) {
		IS_Widget[i] = null;
	}
	for(var i  in IS_EventDispatcher.eventListenerList){
		IS_EventDispatcher.eventListenerList[i] = null;
	}
}


IS_Portal.currentLink = {};
IS_Portal.iFrameOnLoad = function() {
	var divUrl = document.getElementById("iframeUrl");
	window.scroll(0,0);
	try{
		var url = window.ifrm.location.href;
		if(url == "about:blank") return;
		
		divUrl.value = url;
		if(IS_Portal.currentLink.url) {
			try{
				var nodeName = IS_Portal.currentLink.element.nodeName.toLowerCase();
				if(nodeName == "a")
					IS_Portal.currentLink.element.href = IS_Portal.currentLink.url;
				else if(nodeName == "form")
					IS_Portal.currentLink.element.action = IS_Portal.currentLink.url;
			}catch(e){
			}
		}
		IS_Portal.currentLink.element = null;
		
		if($("iframe-tool-bar").style.display == "none"){
			$("iframe-tool-bar").style.display = "block";
			IS_Portal.adjustIframeHeight();
		}
		
		try{
			if(IS_User.IframeOnload) IS_User.IframeOnload(divUrl.value);
		}catch(e){}
	}catch(e){
//		divUrl.className = "iframeUrlError";
		var ifrmToolBar = document.getElementById("iframe-tool-bar");
		ifrmToolBar.style.display = "none";
		IS_Portal.currentLink = {};
		IS_Portal.adjustIframeHeight();
	}
}


/**
 * iframeToolBar
 */
IS_Portal.buildIframeToolBar = function() {
	var iframeToolBar = document.getElementById("iframe-tool-bar");
	iframeToolBar.style.display = "none";
	
	if( IS_Portal.iframeToolBar )
		return;
	
	iframeToolBar.style.backgroundColor = "#EEEEEE";
	
	IS_Portal.iframeToolBar = new IS_Portal.ContentFooter({
		id: "iframe-tool-bar",
		isDisplay: function() {
			return true; // ?
		},
		getTitle: function() {
			try {
				return window.ifrm.document.title;
			} catch( ex ) {
				msg.warn( ex );
			}
			
			return "";
		},
		getUrl: function() {
			try {
				return document.getElementById("iframeUrl").value;
			} catch( ex ) {
				msg.warn( ex );
			}
			
			return "";
		},icons: [
			{
				html: '<table width="100%"><tr><td><input readOnly="readOnly" id="iframeUrl"></td></tr></table>'
			}
		]
	});
	
	IS_Portal.iframeToolBar.displayContents();
	
	IS_Portal.iframeToolBar.elm_toolBar.style.width = "100%";
	
	iframeToolBar.appendChild( IS_Portal.iframeToolBar.elm_toolBar );
	
	$("iframeUrl").parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.style.width = "100%";
}

/*
IS_Portal.buildErrReportTool  function(){
	var reportDiv = document.createElement("div");
	reportDiv.style.cssFloat = "right";
	reportDiv.id = "iframe_reportTool_form";
	
	var reportButton = document.createElement("input");
	reportButton.type = "button";
	reportButton.id = reportDiv.id + "_button";
	Event.observe(reportButton, 'click', IS_Portal.errorReport, false);

	var indicator = document.createElement("img");
	indicator.src = imageURL+"ajax-loader.gif";
	indicator.style.top = "3px";
	indicator.id = reportDiv.id + "_indicatorMini";
	indicator.style.visibility = "hidden";
	
	reportDiv.appendChild(reportButton);
	reportDiv.appendChild(indicator);
	IS_Portal.setReportLabel(reportButton);
	
	return reportDiv;
}

IS_Portal.setReportLabel = function(reportButton){
	if(reportButton){
		reportButton.value = IS_R.lb_obstacleReort;
		reportButton.disabled = false;

		var reportDiv = document.createElement("div");
		var indicator =  document.getElementById("iframe_reportTool_form_indicatorMini");
		//indicator.style.visibility ="hidden";
	}
}

IS_Portal.errorReport = function(){
	var indicator =  document.getElementById("iframe_reportTool_form_indicatorMini");
	indicator.style.visibility ="visible";
	
	var opt = {
		method: 'post' ,
		asynchronous:true,
		onSuccess: reportFinished,
		onFailure: function(t) {
			msg.error(IS_R.getResource(IS_R.lb_obstacleReortfailure,[t.status,t.statusText,text,encoding]));
			reportFinished();
			var reportButton = $("iframe_reportTool_form_button");
			reportButton.value = IS_R.lb_reportFailure;

		},
		onException: function(r, t){
			msg.error(IS_R.getResource(IS_R.lb_obstacleReortexception,[t]));
			reportFinished();
			var reportButton = $("iframe_reportTool_form_button")
			reportButton.value = IS_R.lb_reportFailure;
		}
	};
	
	var reportURL = IS_Portal.currentLink.url;
	var url = hostPrefix + "/erpsrv?url=" + encodeURIComponent(reportURL);
	AjaxRequest.invoke(url, opt);
	
	function reportFinished(){
		var reportButton = $("iframe_reportTool_form_button");
		
		if(reportButton && (reportURL == IS_Portal.currentLink.url)){
			reportButton.value = IS_R.lb_reportFinished;
			reportButton.disabled = true;
			indicator.style.visibility ="hidden";
			window.ifrm.location.href = IS_Portal.currentLink.url;
		}
	}
}
*/
IS_Portal.isInlineUrl = function(url){
	if(!url || !displayInlineHost) return false;
	if(!url.match(/\w+:[\/]+([^\/]*)/)) return false;
	var host = RegExp.$1;
	for(var i=0;i<displayInlineHost.length;i++){
		if(displayInlineHost[i] == '*' || displayInlineHost[i] == host){
			return true;
		}
	}
	return false;
}

IS_Portal.showIframe = function(url){
	var iframeToolBar = $("iframe-tool-bar");
	if(iframeToolBar.innerHTML == "")
		IS_Portal.buildIframeToolBar();
	
	IS_Portal.CommandBar.changeIframeView();
	
	var divIFrame = $("search-iframe");
	if ( divIFrame ) {
		divIFrame.style.display = "none";
	}
	
	var divIFrame = $("portal-iframe");

	var divIS_PortalWidgets = document.getElementById("panels");
	divIS_PortalWidgets.style.display="none";
	IS_Portal.widgetDisplayUpdated();

	divIFrame.style.display="";
	var iframe = $("ifrm");
	iframe.src = url? url : "";
	setTimeout(IS_Portal.adjustIframeHeight.bind(iframe, null, iframe), 1);

	IS_Portal.refresh.cancel();
}

IS_Portal.openIframe = function(url){
	if(IS_Widget.MiniBrowser.isForbiddenURL(url)){
		window.open("", url);
		return;
	}
	IS_Portal.showIframe(url);
}

IS_Portal.buildIFrame = function (aTag) {
	if(aTag) {
		if(/^notes:\/\//i.test( aTag.href )){
			aTag.target = "_self";
			return;
		}
		
		if(!aTag.target)
			aTag.target = IS_Portal.isInlineUrl(aTag.href) ? "ifrm" : "_blank";
		if(aTag.target != "ifrm"){ 
			return;
		}else if(IS_Widget.MiniBrowser.isForbiddenURL(aTag.href)){
			//It is displayed in new window as aTag.href is limited to display in portal frame by administrator.
			alert(IS_R.getResource(IS_R.ms_iframeForbiddenURL,[aTag.href]));
			aTag.target = "_blank";
			return;
		}
	}
	if(Browser.isSafari1 && IS_Portal.isTabLoading())
		return;
	
	if(aTag && aTag.nodeName) {
		IS_Portal.currentLink = {element:aTag};
		
		var nodeName = aTag.nodeName.toLowerCase();
		if(nodeName == "a") {
			IS_Portal.currentLink.url = aTag.href;
//			aTag.href = proxyServerURL + "URLReplace/" + aTag.href;
		} else if(nodeName == "form"){
			IS_Portal.currentLink.url = aTag.action;
//			aTag.action = proxyServerURL + "URLReplace/" + aTag.action;
		}
	}
			
	IS_Portal.showIframe();
};

if( Browser.isSafari1 ){
	IS_Portal.buildIFrame = ( function() {
		var buildIFrame = IS_Portal.buildIFrame;
		
		return function( aTag ) {
			if( IS_Widget.MaximizeWidget )
				IS_Widget.MaximizeWidget.turnbackMaximize();
			
			buildIFrame.apply( this,[aTag]);
			if( aTag.target != "ifrm")
				return;
			
			IS_Portal.disableCommandBar();
			IS_Portal.currentTabId = "_"+IS_Portal.currentTabId;
		}
	})();
}

//Trash start
//TODO: The tarsh handling Safari should be considered as it is hard to maintain.
IS_Portal.Trash = new function() {
	var self = this;
	this.initialize = function() {
		this.tempWidgets = [];

		var trashIconContainer = $("portal-trash");
		if(!trashIconContainer) return;
		trashIconContainer.title = IS_R.lb_trashBox;
		var trashIcon = document.createElement("div");
		this.trashIcon = trashIcon;
		trashIcon.className = "trashIcon";
		trashIconContainer.appendChild(trashIcon);

		if(trashIconContainer.parentNode && trashIcon.offsetWidth)
			trashIconContainer.parentNode.style.width = trashIcon.offsetWidth;
		
		IS_Event.observe(trashIcon, "mouseover", this.addIconEventListener.bind(this), false, "_trashInit");
	}
	this.addIconEventListener = function(){
		IS_Event.unloadCache("_trashInit");
		IS_Event.observe(this.trashIcon, "mousedown", this.displayModal.bind(this), false);
		this.modal = new Window({
			className: "alphacube",
			title: IS_R.lb_trashBox,
			width:600,
			height:350,
			minimizable: false,
			maximizable: false,
			resizable: true,
			showEffect: Element.show,
			hideEffect: Element.hide,
			recenterAuto: false,
			//destroyOnClose: true,
			onClose:function(){
				var trashContext = $("trashContext");
				if(trashContext) trashContext.style.display = "none";
			},
			zIndex: 10000 
		});
	}
	this.add = function(widget){
		var widgetConf = widget.widgetConf;
		if(!widgetConf.deleteDate) {//deleteDate must be set ahead in asynchronous.
			if(widget.oldParent && widget.oldParent.widgetConf.deleteDate) {
				widgetConf.deleteDate = widget.oldParent.widgetConf.deleteDate;
			}else{
				widgetConf.deleteDate = new Date().getTime();
			}
		}
		if(!this.widgets && !this.isLoading)
			this.loadTrashWidgets(true);
		this._add(widget);
		if(this.modal && this.modal.element.style.display != "none")
			this.displayModal();
	}
	this._add = function(widget){
		var widgetConf = widget.widgetConf;
		widgetConf.id = IS_Portal.getTrueId(widget.id);
		if(!widgetConf.tabId)
			widgetConf.tabId = widget.tabId ? widget.tabId : IS_Portal.currentTabId;
		if(widget.oldParent)
			widgetConf.parentId = IS_Portal.getTrueId(widget.oldParent.id);
		if(!widgetConf.title)//Processing for RssReader that is added from LINK tag of HTML.
		  widgetConf.title = widget.title;
		if(!this.widgets && this.isLoading){
			this.tempWidgets.unshift(widgetConf);
		} else {
			this.widgets.unshift(widgetConf);
		}
	}
	this.loadTrashWidgets = function(asynchronous){
		this.isLoading = true;
		AjaxRequest.invoke("trashwidget", {		
			method: 'post' ,
			asynchronous: asynchronous ? true : false,
			onSuccess: function(res){
				var widgets = eval("("+res.responseText+")");
				self.widgets = self.tempWidgets;
				for(var i=0;i<widgets.length;i++){
					self.widgets.push(widgets[i]);
				}
				delete self.tempWidgets;
			},
			onFailure: function(t) {
				msg.error(IS_R.getResource(IS_R.ms_trashLoadonFailure,[t.status,t.statusText]));
			},
			onException: function(r, t){
				msg.error(IS_R.getResource(IS_R.ms_trashonException,[getText(t)]));
			},
			onComplete: function(){
				self.isLoading = false;
			}
		});
	}
	function restoreWidget(widget){
		return function(e){
			Event.stop(e);
			if(existWidget(widget.id, widget.type)){
				alert(IS_R.getResource(IS_R.ms_widgetDuplicateWarn, [widget.id]));
				hideContextMenu();
				return;
			}
			var newSubWidgets = [];
			var widgets = self.widgets;
			for(var i=0;i<widgets.length;i++){
				if(isParent(widgets[i], widget)){
					if(existWidget(widgets[i].id)){
						alert(IS_R.getResource(IS_R.ms_widgetDuplicateWarn, [widgets[i].id]));
						return;
					}
					var tempsubw = Object.extend({}, widgets[i]);
					delete tempsubw.deleteDate;
					newSubWidgets.push(tempsubw);
				}
			}
			newSubWidgets.reverse();
			
			var newwidget = Object.extend({}, widget);
			if( /MultiRssReader/.test( newwidget.type ) && /^p_/.test( newwidget.id ))
				newwidget.id = IS_Portal.currentTabId+"_"+newwidget.id;
			
			if( IS_Widget.MaximizeWidget && IS_Widget.MaximizeWidget.headerContent )
				IS_Widget.MaximizeWidget.headerContent.turnbackMaximize();
			
			delete newwidget.deleteDate;
			var w = IS_WidgetsContainer.addWidget(IS_Portal.currentTabId, newwidget, false, false, newSubWidgets);
			IS_Widget.setWidgetLocationCommand(w);
			emptyWidget(widget)();
			
			IS_Portal.widgetDropped( w );
			
			newSubWidgets.each( function( subWidget ){
				var sw = IS_Portal.getWidget( subWidget.id,IS_Portal.curentTabId );
				IS_Portal.widgetDropped( sw );
			});
			
			if( newwidget.parentId )
				delete newwidget.parentId;
		}
	}
	function existWidget(widgetId, type){
		if(type && /MultiRssReader/.test(type) && /^p_/.test(widgetId)){
			var widget = IS_Portal.getWidget(widgetId, IS_Portal.currentTabId);
			if(widget) return true;
			return false;
		}
		for(var i=0; i < IS_Portal.tabList.length; i++){
			var widget = IS_Portal.getWidget(widgetId, IS_Portal.tabList[i].id);
			if(widget) return true;
		}
		return false;
	}
	function isParent(widget, parent){
		if(widget.parentId
			&& widget.parentId == parent.id
			&& widget.deleteDate == parent.deleteDate)
			return true;
		return false;
	}
	function emptyAllWidget(){
		self.widgets = [];
		
		//FIXME
		if( Browser.isSafari1 ) {
			setTimeout( self.displayModal.bind( self ),100 );
		} else {
			self.displayModal();
		}
		var cmd = new IS_Commands.EmptyAllWidgetCommand();
		IS_Request.CommandQueue.addCommand(cmd);
	}
	function emptyWidget(widget){
		return function(){
			var widgets = self.widgets;
			for(var i=0;i<widgets.length;i++){
				if(widgets[i].id == widget.id && widgets[i].deleteDate == widget.deleteDate){
					widgets.splice(i,1);
					break;
				}
			}
			//Delete sub widget
			var widgets = self.widgets;
			for(var i=0;i<widgets.length;i++){
				if(isParent(widgets[i], widget)){
					widgets.splice(i,1);
					i--;
				}
			}
			hideContextMenu();
			self.displayModal();
			var cmd = new IS_Commands.EmptyWidgetCommand(widget);
			IS_Request.CommandQueue.addCommand(cmd);
		}
	}
	function showContextMenu(widget, titleTd){
		return function(e){
			try {
				Event.stop(e);
			} catch( ex ) {
				//ignore
			}
			
			if(self.selectedWidgetTd)
				self.selectedWidgetTd.className = "";
			var trashContext = $("trashContext");
			var style = null;
			var table = null;
			if(!trashContext) {
				trashContext = document.createElement("div");
				trashContext.id = "trashContext";
				style = trashContext.style;
				style.position = "absolute";
				style.zIndex = "99999";
				table = createElm("table");
				trashContext.appendChild(table);
				document.body.appendChild(trashContext);
			} else {
				style = trashContext.style;
				table = trashContext.getElementsByTagName("table")[0];
			}
			var tbody = document.createElement("tbody");
			var restoreOpt = {
				listeners:[
					{event:"mousedown",listener:restoreWidget(widget)},
					{event:"mouseover",listener:moverContextMenu},
					{event:"mouseout",listener:moutContextMenu}
				]
			};
			tbody.appendChild(createElm("tr",createElm("td",IS_R.lb_turnback,restoreOpt)));
			var emptyOpt = {
				listeners:[
					{event:"mousedown",listener:emptyWidget(widget)},
					{event:"mouseover",listener:moverContextMenu},
					{event:"mouseout",listener:moutContextMenu}
				]
			};
			tbody.appendChild(createElm("tr",createElm("td",IS_R.lb_delete, emptyOpt)));
			var cancelOpt = {
				listeners:[
					{event:"mousedown",listener:hideContextMenu},
					{event:"mouseover",listener:moverContextMenu},
					{event:"mouseout",listener:moutContextMenu}
				]
			};
			tbody.appendChild(createElm("tr",createElm("td",IS_R.lb_cancel, cancelOpt)));
			if(table.firstChild)
				table.replaceChild(tbody, table.firstChild);
			else
				table.appendChild(tbody);
			style.top = Event.pointerY(e);
			style.left = Event.pointerX(e);
			style.display = "block";
			titleTd.className = "trashSelectedWidget";
			self.selectedWidgetTd = titleTd;
		}
	}
	function hideContextMenu(){
		var trashContext = $("trashContext");
		if(trashContext)
			trashContext.style.display = "none";
		if(self.selectedWidgetTd)
			self.selectedWidgetTd.className = "";
	}
	function moverContextMenu(e){
		Event.element(e).className = "trashSelectedMenu";
	}
	function moutContextMenu(e){
		Event.element(e).className = "";
	}
	this.displayModal = function(e){
		IS_Event.unloadCache("_trash");
		var trashTable = createElm("table", false, {className:"trashContainer"});
		var trashBody = createElm("tbody", false, {className:"trashHeader"});
		trashTable.appendChild(trashBody);
		var headerTr = createElm("tr");
		trashBody.appendChild(headerTr);
		headerTr.appendChild(createElm("td",createElm("a", IS_R.lb_bracketTrashEmptyAll, {
			className:"trashHeaderMenu",
			listeners:{event:"mousedown",listener:emptyAllWidget}
		}), {style:{textAlign:"right"}}));
		trashBody.appendChild(createElm("tr",createElm("td", IS_R.ms_trashContextExplanation)));
		var table = document.createElement("table");
		table.className = "trashTable";
		var thead = document.createElement("thead");
		table.appendChild(thead);
		thead.appendChild(createElm("tr", [
			createElm("th",IS_R.lb_title, {style:{width:"40%"}}),
			createElm("th",IS_R.lb_type, {style:{width:"30%"}}),
			createElm("th",IS_R.lb_deleteDate, {style:{width:"30%"}})
		]));
		var tbody = document.createElement("tbody");
		table.appendChild(tbody);
		if(!this.widgets)
			this.loadTrashWidgets();
		
		if( Browser.isSafari1 )
			var iframe = document.createElement("iframe");
		
		var widgets = this.widgets;
		for(var i = 0; i < widgets.length; i++){
			if(existParent(widgets[i])) continue;
			var tr = document.createElement("tr");
			var icon = createIcon(widgets[i].type);
			icon.style.cursor = "auto";
			//IS_Event.observe(icon, "mousedown", restoreWidget(widgets[i]), false, "_trash");
			if( !widgets[i].title ) continue;
			var titleTd = createElm("td",[icon, widgets[i].title]);
			
			var contextmenuHandler = showContextMenu(widgets[i], titleTd);
			if( Browser.isSafari1 ) {
				
				contextmenuHandler = ( function() {
					var handler = contextmenuHandler;
					
					return function(e) {
						IS_Event.stop(e);
						
						var eventObj = Object.extend( Object.extend({},e),{
							pageX: e.pageX +findPosX( iframe ),
							pageY: e.pageY +findPosY( iframe )
						});
						
						handler.apply( this,[eventObj]);
					}
				})();
			}
			IS_Event.observe(titleTd, "contextmenu",contextmenuHandler, false, "_trash");
			
			tr.appendChild(titleTd);
			
			var type = widgets[i].type;
			var typeConf = IS_Widget.getConfiguration( type );
			if(/^g_/.test( type )) {
				typeName = IS_R.lb_gadget;
			} else {
				typeName = typeConf && typeConf.title ? typeConf.title : type;
			}
			tr.appendChild(createElm("td",typeName));
			var deleteDate = new Date(widgets[i].deleteDate);
			tr.appendChild(createElm("td", formatDate(deleteDate, "yyyy/MM/dd HH:mm:ss")));
			tbody.appendChild(tr);
		}
		var listTd = createElm("td", table);
		listTd.colSpan = "3";
		trashBody.appendChild(createElm("tr",listTd));
		IS_Event.observe(trashTable, "mousedown", hideContextMenu, false, "_trash");
		//this.modal.update(trashTable);
		if( Browser.isSafari1 ) {
			iframe.frameborder = 0;
			iframe.style.width = iframe.style.height = "100%";
			
			var content = document.createElement("div");
			content.style.height = "100%";
			content.appendChild( trashTable )
			IS_Event.observe( iframe,"load",function() {
				var doc = iframe.document || iframe.contentWindow.document;
				
				doc.body.innerHTML = "";
				doc.body.appendChild( content );
			} );
			//FIXME blank.html may help...
			iframe.src = "./iframe.jsp"
			
			trashTable = iframe;
		}
		
		this.modal.setContent(trashTable);
		
		if(e) {//Event is passed only if trash icon is clicked.
			this.modal.showCenter();
		} else {
			this.modal.centered = false;
			this.modal.show();
		}
		
//		this.modal.updateWidth();
	}
	function existParent(widget){
		if(!widget.parentId) return false;
		var widgets = self.widgets;
		for(var i = 0; i < widgets.length; i++){
			if(widgets[i].id == widget.parentId && widgets[i].deleteDate == widget.deleteDate){
				return true;
			}
		}
	}
	function createElm(tagName, childNodes, option){
		var element = document.createElement(tagName);
		if(childNodes) {
			if(typeof childNodes == "object" && childNodes.concat){
				for(var i = 0; i < childNodes.length;i++){
					appendChild(element, childNodes[i]);
				}
			} else {
				appendChild(element, childNodes);
			}
		}
		if(!option) return element;
		if(option.className)
			element.className = option.className;
		if(option.listeners){
			var listeners = option.listeners;
			if(typeof listeners == "object" && listeners.concat){
				for(var i = 0; i < listeners.length;i++){
					var listener = listeners[i];
					addListner(element, listener.event, listener.listener);
				}
			} else {
				addListner(element, listeners.event, listeners.listener);
			}
		}
		if(option.style){
			var style = option.style;
			var elmStyle = element.style;
			for(var i in style){
				if(typeof style[i] == "function") continue;
				elmStyle[i] = style[i];
			}
		}
		return element;
	}
	function appendChild(parent, child){
		if(typeof child == "string")
			parent.appendChild(document.createTextNode(child));
		else
			parent.appendChild(child);
	}
	function addListner(element, event, listener){
		IS_Event.observe(element, event, listener, false, "_trash");
	}
	function createIcon(type){
		var icon = document.createElement("div");
		icon.className = "menuItemIcon";
		IS_Widget.setIcon(icon, type);
		return icon;
	}
}
//End of Trash

IS_Portal.buildFontSelectDiv = function(){
	var currentFontDiv;
	
	var fontEl = $("portal-change-fontsize");
	if(fontEl){
		var fontChangeDiv = document.createElement("div");
		fontChangeDiv.style.width = "40px";
		fontChangeDiv.className = "fontChangeDiv";
		fontEl.appendChild(fontChangeDiv);
		
		var fontChangeDivDel = document.createElement("div");
		fontChangeDivDel.className = "fontChange_small";
		fontChangeDivDel.title = IS_R.lb_resizeFontSmaller;
		
		var fontChangeDivSta = document.createElement("div");
		fontChangeDivSta.className = "fontChange_standard";
		fontChangeDivSta.title = IS_R.lb_resizeFontNormal;
		
		var fontChangeDivAdd = document.createElement("div");
		fontChangeDivAdd.className = "fontChange_large";
		fontChangeDivAdd.title = IS_R.lb_resizeFontLarger;
		
		fontChangeDiv.appendChild(fontChangeDivDel);
		fontChangeDiv.appendChild(fontChangeDivSta);
		fontChangeDiv.appendChild(fontChangeDivAdd);
		
		if( Browser.isSafari1 )
			return;
		
		setButtonActionEvent(fontChangeDivAdd, "mouseover", "outset");
		setButtonActionEvent(fontChangeDivSta, "mouseover", "outset");
		setButtonActionEvent(fontChangeDivDel, "mouseover", "outset");
		
		setButtonActionEvent(fontChangeDivAdd, "mousedown", "inset");
		setButtonActionEvent(fontChangeDivSta, "mousedown", "inset");
		setButtonActionEvent(fontChangeDivDel, "mousedown", "inset");
		
		setButtonActionEvent(fontChangeDivAdd, "mouseout", null);
		setButtonActionEvent(fontChangeDivSta, "mouseout", null);
		setButtonActionEvent(fontChangeDivDel, "mouseout", null);
		
		IS_Event.observe(fontChangeDivAdd, "mouseup", function(){
				setBorder(fontChangeDivAdd, "outset");
				IS_Portal.applyFontSize((parseInt(IS_Portal.defaultFontSize) + 20) + "%");
			}, false, "_fontchange");
		IS_Event.observe(fontChangeDivSta, "mouseup", function(){
				setBorder(fontChangeDivSta, "outset");
				IS_Portal.applyFontSize((parseInt(IS_Portal.defaultFontSize)) + "%");
			}, false, "_fontchange");
		IS_Event.observe(fontChangeDivDel, "mouseup", function(){
				setBorder(fontChangeDivDel, "outset");
				IS_Portal.applyFontSize((parseInt(IS_Portal.defaultFontSize) - 20) + "%");
			}, false, "_fontchange");

		if(fontEl.parentNode && fontChangeDiv.offsetWidth)//Setting width of command bar
			fontEl.parentNode.style.width = fontChangeDiv.offsetWidth;
	}
	function setButtonActionEvent(element, eventName, type){
		IS_Event.observe(element, eventName, function(){
			setBorder(element, type);
		}, false, "_fontchange");
	}
	function setBorder(element, type){
		element.style.border = "";
		if(type == "inset"){
			element.style.borderTop = "1px solid #A9A9A9";
			element.style.borderLeft = "1px solid #A9A9A9";
		}
		else if(type == "outset"){
			currentFontDiv = element;
			element.style.borderRight = "1px solid #A9A9A9";
			element.style.borderBottom = "1px solid #A9A9A9";
		}
	}

}

IS_Portal.fontChangeFlg = false;
IS_Portal.applyFontSize = function(fontSize) {
	IS_Portal.fontChangeFlg = true;
	if(IS_Portal.fontSize == fontSize)
		return;
//	if(fontSize == "normal")
//		IS_Portal.fontSize = IS_Portal.defaultFontSize;
//	else
		IS_Portal.fontSize = fontSize;
	
	IS_Portal.setFontSize();
}

/**
 * Fix style broken by chaning font size.
 * 
 */
IS_Portal.adjustIS_PortalStyle = function(){
	if(IS_Portal.fontChangeFlg){
		IS_Portal.setFontSize();
		IS_Portal.fontChangeFlg = false;
	}
}

IS_Portal.setFontSize = function(e, isInitialize) {
	is_addCssRule("body", "font-size:" + IS_Portal.fontSize);
	is_addCssRule("th", "font-size:" + IS_Portal.fontSize);
	is_addCssRule("td", "font-size:" + IS_Portal.fontSize);
	
//	is_addCssRule("table", "font-size:" + IS_Portal.fontSize);
	IS_Portal.widgetDisplayUpdated();
	
	if(!isInitialize){
		IS_Widget.Maximize.adjustMaximizeWidth();
		IS_Widget.Information2.adjustDescWidth();
		IS_Portal.adjustIframeHeight();
		IS_Portal.adjustSiteMenuHeight();
		IS_Widget.Ticker.adjustTickerWidth();
		IS_Widget.WidgetHeader.adjustHeaderWidth();
//		IS_WidgetsContainer.adjustColumnWidth();

		//Send to Server
		IS_Widget.setPreferenceCommand("fontSize", IS_Portal.fontSize);
		
		IS_EventDispatcher.newEvent('fontSizeChanged');
	}
}

/**
 * Start detecting change of fant size.
 * Detect the size change of both browser and portal.
 */
IS_Portal.startDetectFontResized = function(){
	var portalBody = $('portal-body');
	var currentSize;
	if(portalBody){
		var detectNode = document.createElement("span");
		detectNode.id = 'fontSizeChangeDetector';
		detectNode.innerHTML='&nbsp;';
		detectNode.style.zIndex = '-100';
		detectNode.style.vizibility = 'hidden';
		portalBody.appendChild( detectNode );
		
		currentSize = detectNode.offsetHeight;
	}
	
	function checkFontSize(){
		var fontSize = detectNode.offsetHeight;
		if( currentSize != fontSize ){
			IS_Portal.onFontResized();
			currentSize = fontSize;
		}
	}
	
	var id = setInterval( checkFontSize, 1000);
}

/**
 * Processing at changing font size.
 */
IS_Portal.onFontResized = function(){
	IS_Portal.widgetDisplayUpdated();
}

IS_Portal.rssSearchBoxList = new Object();
/**
 * Hiding all of search boxes.
 */
/*
IS_Portal.hideRssSearchBox = function(){
	for(var id in IS_Portal.rssSearchBoxList){
		if(!(IS_Portal.rssSearchBoxList[id] instanceof Function)){
			IS_Portal.rssSearchBoxList[id].style.display = "none";
		}
	}
}
*/

/**
 * Processing at changing display position or size of widget
 */
IS_Portal.widgetDisplayUpdated = function(){
//	IS_Widget.adjustDescWidth();
	IS_Widget.processAdjustRssDesc();
	IS_Widget.adjustEditPanelsTextWidth();
//	IS_Portal.hideRssSearchBox();
}

if( Browser.isSafari1 ) {
	IS_Portal.adjustCurrentTabSize =  function() {
		IS_Widget.processAdjustRssDesc();
		IS_Widget.RssReader.RssItemRender.adjustRssDesc();
		IS_Widget.Information2.adjustDescWidth();
		
		IS_Portal.adjustSiteMenuHeight();
		IS_Portal.adjustIframeHeight();
		IS_Portal.adjustGadgetHeight();
	}
}

IS_Portal.setThema = function(thema){
	var head = document.getElementsByTagName('head')[0];
	var customCss = document.getElementById('customCss');

	//Send to Server
	IS_Widget.setPreferenceCommand("thema", IS_Portal.thema);

	if(thema == "default"){
		customCss.href = "";
		IS_Portal.thema = null;
		return;
	}
	var newCustomCss = document.createElement('link');
	newCustomCss.id = 'customCss';
	newCustomCss.rel = 'stylesheet';
	newCustomCss.type = 'text/css';
	newCustomCss.href = staticContentURL +'/skin/' + thema + '/styles.css';
	head.replaceChild(newCustomCss, customCss);
	//head.appendChild(newCustomCss);
	IS_Portal.thema = thema;
}

IS_Portal.windowOverlay = function(id, tag){
	var overlay = document.createElement(tag);
	overlay.className = "windowOverlay";
	overlay.id = id;
	if(tag == 'iframe')overlay.src = './blank.html';
	document.body.appendChild(overlay);
	
	this.show = function(cursorType){
		overlay.style.width = Math.max(document.body.scrollWidth, document.body.clientWidth);
		overlay.style.height = Math.max(document.body.scrollHeight, document.body.clientHeight);
		
		if(cursorType)
			overlay.style.cursor = cursorType;
		else
			overlay.style.cursor = "move";
			
		overlay.style.display = "";
	};
	
	this.hide = function(){
		overlay.style.display = "none";
	};
}
/**
 * Overlay genarated at dragging.
 * As mousemove event is not occued on Iframe, this is used for snvoiding.
 */
IS_Portal.getDragOverlay = function() {
	if(!IS_Portal.dragOverlay)
		IS_Portal.dragOverlay = new IS_Portal.windowOverlay('dragOverlay', 'div');
	return IS_Portal.dragOverlay;
}
IS_Portal.showDragOverlay = function(cursorType) {
	IS_Portal.getDragOverlay().show(cursorType);
}
IS_Portal.hideDragOverlay = function() {
	IS_Portal.getDragOverlay().hide();
}
//#2713 Some frash can not diplayed properly if the winodw is scrolled.
IS_Portal.getIfrmOverlay = function() {
	if(!IS_Portal.ifrmOverlay)
		IS_Portal.ifrmOverlay = new IS_Portal.windowOverlay('ifrmOverlay', 'iframe');
	return IS_Portal.ifrmOverlay;
}

//Adjusting heigght of Gadget.
IS_Portal.adjustGadgetHeight = function( gadget,swap ){
	setTimeout( function() {
		IS_Portal._adjustGadgetHeight( gadget,swap );
	},100 );
}
IS_Portal._adjustGadgetHeight = function( gadget,swap ){
	var widgets;
	if( gadget ) {
		widgets = {};
		widgets[gadget.id] = gadget;
	}
	
	widgets = widgets || IS_Portal.widgetLists[IS_Portal.currentTabId]
	if( !widgets )
		return;
	
	$H( widgets ).values().findAll( function( widget ) {
		return widget.isGadget && widget.isGadget();
	}).each( function( gadget ) {
		try {
			if( swap ) gadgets.rpc.call( gadget.iframe.name,"ieSwapIFrame");
			
			var module = IS_Widget.getConfiguration( gadget.widgetType );
			if( module && module.ModulePrefs && module.ModulePrefs.Require &&
				module.ModulePrefs.Require["dynamic-height"] ) {
				return gadgets.rpc.call( gadget.iframe.name,"adjustHeight");
			} else {
				return;
			}
		} catch( ex ) { }
		
		try {
			return gadget.loadContents();
		} catch( ex ) { console.log( ex )}
	});
}

IS_Portal.moreMsgBar = function() {
	$('message-list-more').show();
	$('message-list-more-btn').hide();
	if(IS_SidePanel.adjustPosition) IS_SidePanel.adjustPosition();
	
	IS_EventDispatcher.newEvent("adjustedMessageBar");
}
IS_Portal.closeMsgBar = function(){
	$('message-bar').hide();
	$('message-list-more').hide();
	$('message-list-more').innerHTML = '';
	$('message-list').innerHTML = '';
	IS_Event.unloadCache('msgBar');
	if(IS_SidePanel.adjustPosition) IS_SidePanel.adjustPosition();
	
	IS_EventDispatcher.newEvent("adjustedMessageBar");
}
/*
IS_Portal.logout = function(){
	IS_Request.asynchronous = false;
	window.onunload();
	window.onunload = null;
	location.href = "authsrv/logout";
}
*/
IS_Portal.setMouseMoveTimer;
IS_Portal.setMouseMoveEvent = function(){
	if(IS_Portal.setMouseMoveTimer) clearTimeout(IS_Portal.setMouseMoveTimer);
	var execFunc = function(){
		IS_Portal.unsetMouseMoveEvent();
		
		var portalTable = $("portal-maincontents-table");
		IS_Event.observe(portalTable, 'mousemove', function(){
			IS_Portal.closeIS_PortalObjects();
			IS_Portal.unsetMouseMoveEvent();
		}, false, "_portalclose");
	}
	IS_Portal.setMouseMoveTimer = setTimeout(execFunc, 100);
}

IS_Portal.unsetMouseMoveEvent = function(){
	IS_Event.unloadCache("_portalclose");
}

IS_Portal.closeIS_PortalObjects = function(){
	if(Browser.isIE) IS_SiteAggregationMenu.closeMenu();
}

IS_Portal.prefsObj = [];
IS_Portal.prefsEls = [];
IS_Portal.buildPortalPreference = function() {
	var currentMenu;
	var preferenceDiv = $("portal-preference");
	var prefPage;
	
	var allSettingBody;
	var rssReaderSettingBody;
	
	var booleanArray = [{value:"true",display_value:IS_R.lb_makeEffective}, {value:"false",display_value:IS_R.lb_invalidate}];
	var dateArray = [];
	for(var dateNum=0;dateNum<10;dateNum++){
		dateArray.push({value:dateNum + 1,display_value:dateNum + 1 + IS_R.lb_businessDate});
	}
	
	var createPreferenceBody = function(){
		var preferenceDiv = document.createElement("div");
		preferenceDiv.className = "preferencePage";
		
		var prefTable = document.createElement("table");
		prefTable.className = "preferenceTable";
		prefTable.cellPadding = 0;
		prefTable.cellSpacing = 0;
		
		var prefTBody = document.createElement("tbody");
		var prefTr = document.createElement("tr");

		var prefTd = document.createElement("td");

		prefPage = document.createElement("div");
		prefPage.style.height = "100%";
		
		
		prefPage.appendChild(buildShowAllSettingBody());
		prefPage.appendChild(buildRssSettingBody());
		prefPage.appendChild(buildCustomizeReset());

		
		prefTable.appendChild(prefTBody);
		prefTBody.appendChild(prefTr);

		prefTr.appendChild(prefTd);
		prefTd.appendChild(prefPage);
		prefPage.appendChild(document.createElement("div"));
		
		var preferenceHeader = document.createElement("div");
		preferenceHeader.className = "preferenceHeader";
		preferenceDiv.appendChild( preferenceHeader );
		
		var closeButton = document.createElement("div");
		closeButton.className = "preferenceClose command";
		closeButton.innerHTML = IS_R.lb_close;
		preferenceHeader.appendChild( closeButton );
		IS_Event.observe( closeButton,"click",function() { Control.Modal.close()} );
		
		var prefTitle = document.createElement("div");
		prefTitle.className = "pageTitle";
		prefTitle.innerHTML = IS_R.lb_setupAll;

		preferenceHeader.appendChild(prefTitle);
		
		preferenceDiv.appendChild(prefTable);
		
		return preferenceDiv;
		
	}
	function createFooterDiv( content ) {
		var footerDiv = document.createElement("div");
		footerDiv.style.width = "100%";
		footerDiv.style.textAlign = "right";
		
		footerDiv.appendChild( content );
		
		return footerDiv;
	}
	function createExecButton() {
		var execButton = document.createElement("input");
		execButton.type = "button";
		execButton.value = IS_R.lb_changeApply;
		Event.observe(execButton, "click", applyPreference );
		
		return createFooterDiv( execButton );
	}
	function applyPreference(){
		for(name in IS_Portal.prefsEls){
			if(IS_Portal.prefsObj && typeof IS_Portal.prefsEls[name] != "function"){
				IS_Portal.prefsObj[name] = IS_Portal.prefsEls[name].value;
			}
		}
		
		//Send command
		var isAllRefresh = false;
		if(IS_Portal.prefsObj.freshDays && IS_Portal.prefsObj.freshDays != ""){
			IS_Portal.freshDays = IS_Portal.prefsObj.freshDays;
			var tempFreshDays = IS_Portal.getFreshDays(IS_Portal.freshDays);
			
			freshDays = tempFreshDays;
			isAllRefresh = true;
			
			//Send to Server
			IS_Widget.setPreferenceCommand("freshDays", IS_Portal.freshDays);
		}
		if(IS_Portal.prefsObj.fontSize){
	//		IS_Portal.applyFontSize(IS_Portal.prefsObj.fontSize);
			setTimeout(IS_Portal.applyFontSize.bind(this, IS_Portal.prefsObj.fontSize), 10);
		}
		if(IS_Portal.prefsObj.mergeconfirm){
			IS_Portal.mergeconfirm = getBooleanValue(IS_Portal.prefsObj.mergeconfirm);
			IS_Widget.setPreferenceCommand("mergeconfirm", IS_Portal.mergeconfirm);
		}
		
		IS_Portal.applyPreference(IS_Portal.currentTabId, true, isAllRefresh);
		
		for(var tabId in IS_Portal.widgetLists){
			if(typeof IS_Portal.widgetLists[tabId] == "function") continue;
			
			if(tabId != IS_Portal.currentTabId){
				// It doesn't apply to non-active tab.
				IS_Portal.tabs[tabId].applyPreference = true;
				IS_Portal.applyPreference(tabId, false, isAllRefresh);
			}
		}
	}
	
	function buildShowAllSettingBody(){
		var wfs = createFieldSet(IS_R.lb_generalSetting);
		
		var freshDaysOpt = {name: "freshDays", display_name: IS_R.lb_freshdaysTerm};
		appendOption(wfs, freshDaysOpt, dateArray, IS_Portal.freshDays);
		
		var mergeconfirmOpt = {name: "mergeconfirm", display_name: IS_R.lb_mergeConfirmDialog};
		appendOption(wfs, mergeconfirmOpt, booleanArray, new String(IS_Portal.mergeconfirm));
		
		wfs.appendChild( createExecButton());
		
		return wfs;
	}
	
	function buildRssSettingBody(){
		var wfs = createFieldSet(IS_R.lb_rssViewSetting);
		
		var rssReaderConf = IS_Widget.getConfiguration("RssReader");
		if(!rssReaderConf){
			var msg = IS_R.ms_rssreaderUnreadable;
			wfs.innerHTML = msg;
			msg.warn(msg);
			return;
		}
		
		if(rssReaderConf.UserPref.doLineFeed){
			appendOption(wfs, rssReaderConf.UserPref.doLineFeed, booleanArray);
		}
		if(rssReaderConf.UserPref.showDatetime){
			appendOption(wfs, rssReaderConf.UserPref.showDatetime, booleanArray);
		}
		if(rssReaderConf.UserPref.detailDisplayMode){
			appendOption(wfs, rssReaderConf.UserPref.detailDisplayMode, rssReaderConf.UserPref.detailDisplayMode.EnumValue);
		}
		if(rssReaderConf.UserPref.itemDisplay){
			appendOption(wfs, rssReaderConf.UserPref.itemDisplay, rssReaderConf.UserPref.itemDisplay.EnumValue);
		}
		if(rssReaderConf.UserPref.scrollMode){
			appendOption(wfs, rssReaderConf.UserPref.scrollMode, rssReaderConf.UserPref.scrollMode.EnumValue);
		}
		
//		if(Browser.isIE){
//			lastp.style.marginBottom = "10px";
//		}
		
		wfs.appendChild( createExecButton());
		
		return wfs;
	}
	
	function buildCustomizeReset() {
		var fs = createFieldSet( IS_R.lb_initialize );
		
		var description = document.createElement("div");
		description.innerHTML = 
			IS_R.lb_clearConfigurationDesc1 +"<br/>"
			+IS_R.lb_clearConfigurationDesc2;
		fs.appendChild( description );
		
		var initButton = document.createElement("input");
		initButton.type = "button";
		initButton.value = IS_R.lb_clearConfigurationButton;
		IS_Event.observe( initButton,"click",function() {
			Control.Modal.close();
			
			if( !confirm( IS_R.ms_clearConfigurationConfirm ))
				return;
			
			IS_Request.asynchronous = false;
			IS_Request.CommandQueue.fireRequest();
			
			var opt = {
				method: 'get' ,
				asynchronous:false,
				onSuccess: function(req){
					window.location.reload( true );
				},
				onFailure: function(t) {
					var msg = IS_R.ms_clearConfigurationFailed;
					alert( msg );
					msg.error( msg );
				}
			};
			AjaxRequest.invoke(hostPrefix +  "/widsrv?reset=true", opt);
		});
		var initField = createField("",initButton );
		fs.appendChild( initField );
		
		return fs;
	}
	
	function createFieldSet(title){
		var fieldSet = document.createElement("fieldSet");
		var legEnd = document.createElement("legEnd");
		fieldSet.appendChild(legEnd);
		legEnd.innerHTML = title;
		return fieldSet;
	}
	
	function createField( labelContent, valueContent ){
		if( typeof( labelContent ) == "string")
			labelContent = document.createTextNode( labelContent );
		
		if( typeof( valueContent ) == "string")
			valueContent = document.createTextNode( valueContent );
		
		var itemTable = document.createElement("table");
		itemTable.cellPadding = "3px";
		itemTable.cellSpacing = 0;
		itemTable.style.width = "100%";
		
		var itemTBody = document.createElement("tbody");
		var itemTr = document.createElement("tr");
		itemTr.className = "option";
		var itemLeftTd = document.createElement("td");
		var itemRightTd = document.createElement("td");
		itemRightTd.className = "rightTd";
		
		itemTable.appendChild(itemTBody);
		itemTBody.appendChild(itemTr);
		itemTr.appendChild(itemLeftTd);
		itemTr.appendChild(itemRightTd);
		
		var titleLabel = document.createElement("label");
		titleLabel.style.fontWeight = "bold";
		titleLabel.appendChild( labelContent );
		
		itemLeftTd.appendChild(titleLabel);
		itemRightTd.appendChild( valueContent );
		
		return itemTable;
	}
	function appendOption( el, obj, selectOptions, selectValue) {
		var selectEl = document.createElement("select");
		selectEl.id = "pref_" + obj.name;
		selectEl.style.width = "150px";
		
		//Head is empty
		var optEl = document.createElement("option");
		optEl.setAttribute("value", "");
		optEl.appendChild(document.createTextNode(IS_R.lb_changeNotApply));
		selectEl.appendChild(optEl);
		
		for(var i=0;i<selectOptions.length;i++){
			if(typeof selectOptions[i] == "function") continue;
			optEl = document.createElement("option");
			optEl.setAttribute("value", selectOptions[i].value);
			optEl.appendChild(document.createTextNode(selectOptions[i].display_value));
			selectEl.appendChild(optEl);
			if(selectValue == selectOptions[i].value){
				optEl.selected =true;
			}
		}
		
		IS_Portal.prefsEls[obj.name] = selectEl;
		
		var field = createField( " "+obj.display_name,selectEl );
		el.appendChild( field );
		
		return field;
	}


	var showModal = function(){
		IS_Portal.currentModal.update(createPreferenceBody());
	}
	
	if(preferenceDiv){
		IS_Portal.currentModal = new Control.Modal(preferenceDiv,{contents: "", containerClassName:"preference"});
		
		preferenceDiv.title = IS_R.lb_setting;
		Event.observe(preferenceDiv, "click", showModal, false);
		

		if(preferenceDiv.parentNode)//Setting of command bar width.
			preferenceDiv.parentNode.style.width = preferenceDiv.offsetWidth;
	}

	
}

IS_Portal.buildCredentialList = function(){
	var portalCredentialListDiv = $("portal-credential-list");
	if(portalCredentialListDiv){
		var credentialListIcon = document.createElement('div');
		credentialListIcon.id = 'authCredentialListIcon';
		credentialListIcon.className = 'authCredentialListIcon';
		credentialListIcon.title = IS_R.lb_credentialList;
		
		portalCredentialListDiv.appendChild(credentialListIcon);
		if(portalCredentialListDiv.parentNode)//Setting of command bar width.
			 portalCredentialListDiv.parentNode.style.width = credentialListIcon.offsetWidth;
		
		IS_Event.observe(credentialListIcon, 'mouseover', function(){
			IS_Event.unloadCache('_portalCredentialListInit');
			IS_Request.showCredentialList();
		}, false, '_portalCredentialListInit');
		
	}
	
}

// Commit change
IS_Portal.applyPreference = function(tabId, isReRender, isAllRefresh){
	
	var _applyPreference = function(){
		var widgetList = IS_Portal.widgetLists[tabId];
		var modifiedWidgetList;
		
		for(var widgetId in widgetList){
			modifiedWidgetList = [];
			
			if(typeof widgetList[widgetId] == "function") continue;
			var isModified = false;
			var widget = widgetList[widgetId];
			if(!widget) continue;
			
			var added = false;
			for(var name in IS_Portal.prefsObj){
				if(typeof IS_Portal.prefsObj[name] == "function") continue;
				
				if(checkValue(widget, IS_Portal.prefsObj, name)){
					widget.setUserPref(name, IS_Portal.prefsObj[name]);
					modifiedWidgetList[widget.id] = widget;
				}
				else if((typeof widget.getUserPref(name) != "undefined") && isAllRefresh && !added){
					modifiedWidgetList[widget.id] = widget;
					added = true;
				}
				
				// Apply in unit of sub category about content display mode.
				// TODO: Processing against the tab not built yet can be cut if building all tabs
				if(/MultiRssReader/.test(widget.widgetType) && name == "itemDisplay" && IS_Portal.prefsObj[name] != ""){
//					if(widget.content){
//						var rssReaders = widget.content.getRssReaders();
						var rssReaders = IS_Portal.getSubWidgetList(widget.id, widget.tabId);
						for(var i=0;i<rssReaders.length;i++){
//							if(widget.content.isDisplay(rssReaders[i]) && checkValue(rssReaders[i], IS_Portal.prefsObj, name)){
								rssReaders[i].setUserPref(name, IS_Portal.prefsObj[name]);
								modifiedWidgetList[rssReaders[i].id] = rssReaders[i];
//							}
						}
//					}
					/*
					else{
						var feeds = widget.widgetConf.feed;
						for(var i=0;i<feeds.length;i++){
							var isDisplay = (getBooleanValue(feeds[i].isChecked) || feeds[i].property.relationalId != IS_Portal.getTrueId(widget.id, widget.widgetType));
							if(isDisplay && IS_Portal.prefsObj[name] != ""){
								feeds[i].property[name] = IS_Portal.prefsObj[name];
								
								//Send to Server
								var cmd = new IS_Commands.UpdateWidgetPropertyCommand(tabId.substring(3), feeds[i], name, IS_Portal.prefsObj[name]);
								IS_Request.CommandQueue.addCommand(cmd);
							}
						}
					}
					*/
					
				}
			}
			
			// Redraw
			if(widget.content && isReRender){
				for(var id in modifiedWidgetList){
					var modWidget = modifiedWidgetList[id];
					if(!modWidget.content || typeof modWidget == "function") continue;
					
					var type = modWidget.widgetType;
					if( isAllRefresh && modWidget.content.isRssReader && modWidget.isComplete) {
						var cacheKey = modWidget.id;
						Ajax.Request.lastModified[cacheKey] = null;
						Ajax.Request.etag[cacheKey] = null;
						Ajax.Request.cache[modWidget.content.getUrl()] = null;
						
						modWidget.loadContents();
						if( modWidget.maximize && !modWidget.parent )
							modWidget.maximize.loadContents();
					} else if( isAllRefresh && /MultiRssReader/.test( modWidget.widgetType ) &&
						modWidget.isComplete ) {
						modWidget.content.mergeRssReader.cacheHeaders = false;
						
						if( modWidget.content.isTimeDisplayMode() ) {
							modWidget.loadContents();
						} else {
							modWidget.content.mergeRssReader.isComplete = false;
						}
						
						if( modWidget.maximize ) {
							var maximize = modWidget.maximize;
							maximize.content.getRssReaders().each( function( rssReader ) {
								var cacheKey = rssReader.originalWidget.id;
								Ajax.Request.lastModified[cacheKey] = null;
								Ajax.Request.etag[cacheKey] = null;
								Ajax.Request.cache[rssReader.originalWidget.content.getUrl()] = null;
								
								rssReader.content.ignore304 = true;
							});
							
							maximize.loadContents()
						}
					} else if(modWidget.content.displayContents) {
					// displayContents must be implemented in widaget for rendering again
						modWidget.content.displayContents();
					}
				}
				IS_Portal.tabs[tabId].applyPreference = false;
			}
			
		}
		setTimeout(IS_Portal.endChangeTab, 1);
		
		function checkValue(widget, prefsObj, name){
			if((typeof widget.getUserPref(name) != "undefined") && prefsObj[name] != ""){
				return true;
			}
			return false;
		}
	}
	Control.Modal.close();
	// Display image of loading
	IS_Portal.startChangeTab();
	setTimeout(_applyPreference, 1);
}

//Create link for "To Management Page"
IS_Portal.buildAdminLink = function(){
	if(!is_isAdministrator) return;
	var adminLink = $("portal-admin-link");
	if(!adminLink) return;
	var adminA = document.createElement("a");
	adminA.className = "command";
	adminA.href = "admin";
	adminA.target = "_blank";
	adminA.appendChild(document.createTextNode(IS_R.lb_adminLink));
	adminLink.appendChild(adminA);

	if(adminLink.parentNode)
		adminLink.parentNode.style.width = adminA.offsetWidth+"px";
	//if( Browser.isIE )
	//	adminLink.style.width = adminLink.offsetWidth+"px";
}

IS_Portal.buildLogout = function() {
	var logout = $("portal-logout");
	if( !logout ) return;
	
	// don't display "Logout", while no user logged in.
	if( !is_userId ){
		logout.parentNode.style.display = "none";
		return;
	}
	
	var anchor = document.createElement("a");
	anchor.className = "command logout";
	anchor.href = "#";
	Event.observe( logout,"click",function( e ) {
		if( window.IS_Preview ) return Event.stop( e );
		
		Event.stopObserving( window,"unload",windowUnload );
		windowUnload();
		location.href = "logout";
	});
	anchor.appendChild( document.createTextNode( IS_R.lb_logout ));
	logout.appendChild( anchor );
	if( logout.parentNode  )
		logout.parentNode.style.width = logout.offsetWidth +"px";
}

// Log at dropping and drop processing
/*IS_Portal.menuDropped = function( id, rssUrl, title ){
	IS_EventDispatcher.newEvent('dropWidget', id, null);
	
	if(rssUrl && rssUrl.length != 0){
		var cmd = new IS_Commands.UpdateRssMetaCommand("1", rssUrl, rssUrl, title, "");
		IS_Request.LogCommandQueue.addCommand(cmd);
	}
}*/

IS_Portal.widgetDropped = function( widget ) {
	if( IS_TreeMenu.isMenuItem( widget.id ) )
		IS_EventDispatcher.newEvent( IS_Widget.DROP_WIDGET, IS_TreeMenu.getMenuId( widget.id ) );
	
//	var url = widget.getUserPref("url");
//	if( url ) {
//		IS_EventDispatcher.newEvent( IS_Widget.DROP_URL,url,widget );
//	}
}

// create message bar element.
IS_Portal.initMsdBar = function(){
	var msgbarDiv = document.createElement("div");
	msgbarDiv.id = "portal_msgbar";
	document.body.appendChild(msgbarDiv);
	IS_Portal.setDisplayMsgBarPosition();
	IS_Event.observe(window,"scroll", IS_Portal.setDisplayMsgBarPosition, false, "_msgbar");
	IS_Event.observe(window,"resize", IS_Portal.setDisplayMsgBarPosition, false, "_msgbar");
}

// set message bar position.
IS_Portal.setDisplayMsgBarPosition = function(){
	if($("portal_msgbar").style.display == "none") return;
	var scrollTop = parseInt(document.body.scrollTop);
	var innerHeight = getWindowHeight();
	var offset = parseInt($("portal_msgbar").offsetHeight);
	if(!Browser.isIE) offset += 1;
	
	$("portal_msgbar").style.top = (scrollTop + innerHeight) - offset;
}

// display message bar.
IS_Portal.displayMsgBar = function(id, msg){
	if(!$("portal_msgbar")) IS_Portal.initMsdBar();
	var msgBar = $("portal_msgbar");
	var msgLine = $("msgBar_" + id);
	if (!msgLine) {
		msgLine = document.createElement("div");
		msgLine.id = "msgBar_" + id;
		msgBar.appendChild(msgLine);
	}
	msgLine.innerHTML = msg;
	msgBar.style.display = "";
	IS_Portal.setDisplayMsgBarPosition();
}

// undisplay message bar.
IS_Portal.unDisplayMsgBar = function(id){
	var msgLine = $("msgBar_" + id);
	if(msgLine && msgLine.parentNode)
		msgLine.parentNode.removeChild(msgLine);
	else
		return;
	IS_Portal.setDisplayMsgBarPosition();
	var msgBar = $("portal_msgbar");
	if(msgBar.childNodes.length == 0)
		msgBar.style.display = "none";
}

IS_Portal.behindIframe = {
	init:function(){
		if(!Browser.isIE)return;
		this.behindIframe = $(document.createElement('iframe'));
		this.behindIframe.border = 0;
		this.behindIframe.style.margin = 0;
		this.behindIframe.style.padding = 0;
		this.behindIframe.id = "is_portal_behind_iframe";
		this.behindIframe.frameborder = 0;
		this.behindIframe.style.position = "absolute";
		this.behindIframe.src = "./blank.html";
		document.getElementsByTagName('body')[0].appendChild(this.behindIframe);
		this.behindIframe.hide();
	},
	
	show:function(element){
		if(!Browser.isIE)return;
		Position.prepare();
		var pos = Position.cumulativeOffset(element);
		this.behindIframe.style.top = pos[1] + "px";
		this.behindIframe.style.left = pos[0] + "px";
		this.behindIframe.style.width = element.offsetWidth;
		this.behindIframe.style.height = element.offsetHeight;
		if(element.style.zIndex)
		  this.behindIframe.style.zIndex = element.style.zIndex -1 ;
		this.behindIframe.show();
		
		this.current = element;
	},
	
	hide:function(){
		if(!Browser.isIE)return;
		this.behindIframe.style.left = 0 + "px";
		this.behindIframe.style.top = 0 + "px";
		this.behindIframe.style.width = 0;
		this.behindIframe.style.height = 0;
		this.behindIframe.hide();
	}
}

IS_Portal.CommandBar = {
	commandbarWidgetDivs : [],
	commandbarWidgets : [],
	init : function(){
		this.elm_commandbar = $('portal-command');
		var commandBarItems =  this.elm_commandbar.getElementsByTagName('tr')[0].childNodes;
		
		for(var i = 0; i < commandBarItems.length;i++){
			if(commandBarItems[i].nodeType != 1)continue;
			
			var itemDiv = commandBarItems[i].getElementsByTagName('div')[0];
			var itemId = itemDiv.id.replace(/^s_/, "");
			
			var cmdBarWidget = IS_Portal.getWidget(itemId, IS_Portal.currentTabId);
			if(cmdBarWidget){
				this.commandbarWidgets[itemId] = cmdBarWidget;
			}
			this.commandbarWidgetDivs[itemId] = itemDiv;
		}
		
	},
	changeDefaultView : function(){
		this.toggleView(false);
	},
	changeIframeView : function(){
		this.toggleView(true);
	},
	toggleView : function(isFrameView){
		for(var i in this.commandbarWidgetDivs){
			var itemDiv = this.commandbarWidgetDivs[i];
			
			if(typeof itemDiv == "function") continue;
			
			var itemId = itemDiv.id.replace(/^s_/, "");
			if(itemId == "portal-go-home")
				itemDiv.style.display = (isFrameView)? "" : "none";
			else if(this.isIframeViewHiddenWidget(itemId))
				itemDiv.style.display = (isFrameView)? "none" : "";
		}
		IS_Widget.Ticker.adjustTickerWidth();
	},
	isIframeViewHiddenWidget : function(itemId){
		// Judge commandbar widget hidden at displaying frmae in portal
		if(itemId == "portal-admin-link")
			return false;
		
		var cmdBarWidget = this.commandbarWidgets[itemId];
		if(cmdBarWidget && (cmdBarWidget.widgetType == "Ticker" || cmdBarWidget.widgetType == "Ranking"))
			return false;
		
		return true;
	},
	isCommandBarWidget : function(widget){
		// Create for removing commandbar widget in tab list
		var itemId = (widget.id)? widget.id : widget;
		return (this.commandbarWidgets[itemId])? true : false;
	}
};

IS_Portal.checkSystemMsg = function(){
	var opt = {
	  method:'get',
	  asynchronous:true,
	  onSuccess:function(req){
		  var results = req.responseText.evalJSON();
		  if(!results || results.length == 0) return;
		  var systemMessageVar = $('system-message-var');
		  
		  if(!systemMessageVar){
			  var msgListDiv = $('message-list');
			  systemMessageVar = $.DIV(
				  {
					id:'message-newmsg'
				  });
			  msgListDiv.appendChild(systemMessageVar);
		  }else{
			  systemMessageVar.innerHTML = "";
		  }
		  results.each(function(msg){
			  if(msg.resourceId){

				  systemMessageVar.appendChild(
					  $.DIV(
						  {},
						  $.IMG(
							  {
								style:'position:relative;top:2px;paddingRight:2px',
								src:imageURL+"information.gif"
							  }
							  ),
						  IS_R.getResource(IS_R[msg.resourceId], msg.replaceValues)
						  )
					  );

			  }else{
				  console.log("non implementation");
			  }
		  });
		  $('message-bar').style.display = "";
		  IS_EventDispatcher.newEvent("adjustedMessageBar");
	  },
	  onFailure: function(t) {
		  msg.error(IS_R.getResource( IS_R.lb_getSystemMessageFailure +'{0} -- {1}',[t.status, t.statusText]));
	  },
	  onException: function(r, t){
		  msg.error(IS_R.getResource( IS_R.lb_getSystemMessageFailure +'{0}',[getErrorMessage(t)]));
	  }
	};
	AjaxRequest.invoke(hostPrefix + '/sysmsg', opt);
}

IS_Portal.getPortalOverlay = function() {
	if(!IS_Portal.portalOverlay)
		IS_Portal.portalOverlay = new IS_Portal.windowOverlay('portalOverlay', 'div');
	return IS_Portal.portalOverlay;
}

IS_Portal.startIndicator = function(e){
	var divOverlay = $("divOverlay");
	var panel = document.getElementById("panels");
	if(!divOverlay){
		divOverlay = document.createElement("img");
		divOverlay.src = imageURL +"indicator_verybig.gif";
		divOverlay.id = "divOverlay";
		divOverlay.className = "tabLoading";
		document.body.appendChild(divOverlay);
	}else{
		divOverlay.style.display = "block";
	}
	if(panel.offsetWidth > 0){
		divOverlay.style.top = findPosY(panel) + 200;
		divOverlay.style.left = findPosX(panel) + panel.offsetWidth/2 - divOverlay.offsetWidth/2;
	}
	IS_Portal.getPortalOverlay().show("default");
}

IS_Portal.endIndicator = function(e){
	var divOverlay = $("divOverlay");
	if(divOverlay){
		divOverlay.style.display = "none";
	}
	IS_Portal.widgetDisplayUpdated();
	
	IS_Portal.getPortalOverlay().hide();
}
