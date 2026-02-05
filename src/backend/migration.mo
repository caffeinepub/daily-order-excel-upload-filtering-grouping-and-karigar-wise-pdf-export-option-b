import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    dailyOrders : Map.Map<Text, List.List<{ orderId : Text; design : Text; product : Text }>>;
    karigarAssignments : Map.Map<Text, Map.Map<Text, { orderId : Text; karigar : Text; factory : ?Text }>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    designToKarigar : Map.Map<Text, Text>;
  };

  type NewActor = {
    dailyOrders : Map.Map<Text, List.List<{ orderId : Text; design : Text; product : Text }>>;
    karigarAssignments : Map.Map<Text, Map.Map<Text, { orderId : Text; karigar : Text; factory : ?Text }>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    karigarMappingWorkbook : Map.Map<Text, Map.Map<Text, Text>>;
  };

  public func run(old : OldActor) : NewActor {
    let karigarMappingWorkbook = Map.empty<Text, Map.Map<Text, Text>>();
    karigarMappingWorkbook.add("1", old.designToKarigar);
    { old with karigarMappingWorkbook };
  };
};
