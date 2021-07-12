$(function(){var n=Object.getOwnPropertyDescriptor(Window.prototype,"event"),t=!1,i,r;Object.defineProperty(window,"event",{configurable:!0,get:function(){var r=n?n.get.apply(this,arguments):i;return r||!t?r:{}},set:function(t){n?n.set.apply(this,arguments):i=t}});r=window.__doPostBack;window.__doPostBack=function(){t=!0;r.apply(this,arguments);t=!1}});
//# sourceMappingURL=AjaxWebFormsWindowEventRedefine.min.js.map

//# sourceMappingURL=AjaxWebFormsWindowEventRedefine.min.js.map
