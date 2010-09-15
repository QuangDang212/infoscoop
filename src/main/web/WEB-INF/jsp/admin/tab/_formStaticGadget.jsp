<%@ page contentType="text/html; charset=UTF8" %>
<%@ taglib uri="http://tiles.apache.org/tags-tiles" prefix="tiles" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/xml" prefix="x" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>
<form:form modelAttribute="tabTemplateStaticGadget" method="post" action="submitGadgetSettings" class="cssform">
	<form:hidden path="id" />
	<form:hidden path="containerId" />
	<form:hidden path="tabTemplateId" />
	<form:hidden path="fkGadgetInstance.type" />
	<fieldset>
		<legend>タイプ</legend>
		<p>
			<x:choose>
				<x:when select="$conf/widgetConfiguration/@title"><x:out select="$conf/widgetConfiguration/@title" /></x:when>
				<x:when select="$conf/Module/ModulePrefs/@directory_title"><x:out select="$conf/Module/ModulePrefs/@directory_title" /></x:when>
				<x:when select="$conf/Module/ModulePrefs/@title"><x:out select="$conf/Module/ModulePrefs/@title" /></x:when>
				<x:otherwise>${tabTemplateStaticGadget.fkGadgetInstance.type}</x:otherwise>
			</x:choose>
		</p>
		<a id="change_type"/>Change Type</a>
	</fieldset>
	<fieldset>
		<legend>共通設定</legend>
		<p>
			<form:label for="fkGadgetInstance.title" path="fkGadgetInstance.title" cssErrorClass="error">タイトル</form:label>
			<form:input path="fkGadgetInstance.title" /><form:errors path="fkGadgetInstance.title" />
		</p>
		<p>
			<form:label for="fkGadgetInstance.href" path="fkGadgetInstance.href" cssErrorClass="error">リンク</form:label>
			<form:input path="fkGadgetInstance.href" /><form:errors path="fkGadgetInstance.href" />
		</p>
	</fieldset>
	<fieldset id="gadget_settings">
		<legend>ガジェット設定</legend>
		<x:forEach var="userPref" select="$conf//UserPref">
			<x:if select="$userPref/@admin_datatype or $userPref/@datatype!='hidden'">
				<p>
					<label><x:out select="$userPref/@display_name"/></label>
					<x:choose>
						<x:when select="$userPref/@admin_datatype">
							<c:set var="datatype"><x:out select="$userPref/@admin_datatype"/></c:set>
						</x:when>
						<x:otherwise>
							<c:set var="datatype"><x:out select="$userPref/@datatype"/></c:set>
						</x:otherwise>
					</x:choose>
					<c:set var="name"><x:out select="$userPref/@name"/></c:set>
					<x:choose>
						<x:when select="$userPref/EnumValue">
							<select name="fkGadgetInstance.userPrefs[${name}]" class="${datatype}">
							<x:forEach var="enum" select="$userPref/EnumValue">
								<c:set var="value"><x:out select="$enum/@value"/></c:set>
								<c:set var="display_value"><x:out select="$enum/@display_value"/></c:set>
								<c:choose>
									<c:when test="${tabTemplateStaticGadget.fkGadgetInstance.userPrefs[name] == value}">
										<option value="${value}" selected="selected">${display_value}</option>
									</c:when>
									<c:otherwise>
										<option value="${value}">${display_value}</option>
									</c:otherwise>
								</c:choose>
							</x:forEach>
							</select>
						</x:when>
						<x:otherwise>
							<input type="${datatype}" name="fkGadgetInstance.userPrefs[${name}]" value="${tabTemplateStaticGadget.fkGadgetInstance.userPrefs[name]}" class="${datatype}"/>
						</x:otherwise>
					</x:choose>
				</p>
			</x:if>
		</x:forEach>
	</fieldset>
	<p>
		<input type="submit" value="作成" class="button"/>
		<input type="reset" value="リセット" class="button" />
	</p>
</form:form>
<script type="text/javascript">
$("#gadget_settings input").each(function(){
	//TODO ここでdatatypeに従ってinputタグを変換
});
$("#gadget_settings select").each(function(){
	if(this.className == "radio"){
		var name = this.name;
		var radioEl = $.SPAN({className:'radio'});
		$(this).find("option").each(function(){
			radioEl.appendChild($.INPUT({type:'radio', value:this.value, name:name, checked:this.selected?"checked":false}));
			radioEl.appendChild($.LABEL({}, this.innerHTML));
		});
		$(this).replaceWith(radioEl);
	}
});

</script>