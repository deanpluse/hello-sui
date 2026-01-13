import { SuiClient, DynamicFieldName } from "@mysten/sui/client";

export async function getDynamicFields(suiClient: SuiClient, parentId: string) {
  // 获取对象的动态字段列表
  const dynamicFields = await suiClient.getDynamicFields({
    parentId: parentId,
    // cursor: null, // 用于分页
    // limit: 50,    // 限制返回数量
  });
  return dynamicFields.data;
}

export async function getDynamicFieldObjectByName(
  suiClient: SuiClient,
  parentId: string,
  name: DynamicFieldName
) {
  const dynamicFieldValueObject = await suiClient.getDynamicFieldObject({
    parentId,
    name,
  });
  return dynamicFieldValueObject;
}

export async function getObject(suiClient: SuiClient, objectId: string) {
  const object = await suiClient.getObject({
    id: objectId,
    options: {
      showBcs: true,
      showContent: true,
      showDisplay: true,
      showOwner: true,
      showPreviousTransaction: true,
      showStorageRebate: true,
      showType: true,
    },
  });
  return object;
}
