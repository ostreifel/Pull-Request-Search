import {Combo} from "VSS/Controls/Combos";
import {IdentityPickerSearchControl, IIdentityPickerSearchOptions} from "VSS/Identities/Picker/Controls";
import {BaseControl} from "VSS/Controls";

const idOptions: IIdentityPickerSearchOptions = {};
BaseControl.createIn(IdentityPickerSearchControl, $('.id-picker'), idOptions);
var actionProvider =  {
};

VSS.register(VSS.getExtensionContext().extensionId, actionProvider);