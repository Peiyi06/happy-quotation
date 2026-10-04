export type QuotationTranslate=(en:string,zh:string)=>string;

export function quotationTerminology(t:QuotationTranslate){
  return {
    customerTrip:t("Customer & Trip","客户与行程"),
    flightInformation:t("Flight Information","航班信息"),
    commercialSettings:t("Commercial Settings","商业设置"),
    pricingStructure:t("Pricing Structure","报价结构"),
    costBreakdown:t("Cost Breakdown","成本明细"),
    tourLeaderCostSetup:t("Tour Leader Cost Setup","领队成本设置"),
    childCostSetup:t("Child Cost Setup","儿童成本设置"),
    quotationPricing:t("Quotation Pricing","报价定价"),
    systemPricingMatrix:t("System Pricing Matrix","系统定价矩阵"),
    finalCustomerPrice:t("Final Customer Price","最终对客售价"),
    travellerType:t("Traveller Type","旅客类型"),
    costItem:t("Cost Item","成本项目"),
    calculation:t("Calculation","计算方式"),
    unitPrice:t("Unit Price","单价"),
    currency:t("Currency","币种"),
    rate:t("Rate","汇率"),
    costPerPax:t("Cost / Pax","每人成本"),
    systemSuggested:t("System Suggested","系统建议价"),
    finalPrice:t("Final Price","最终售价"),
    profit:t("Profit","利润"),
    margin:t("Margin","毛利率"),
  } as const;
}
