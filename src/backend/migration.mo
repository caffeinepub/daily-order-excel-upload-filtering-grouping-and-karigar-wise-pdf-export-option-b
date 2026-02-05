import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
  type Date = Text;

  type OldActor = {
    dailyOrders : Map.Map<Date, List.List<{ orderId : Text; product : Text }>>;
    karigarAssignments : Map.Map<Date, Map.Map<Text, { orderId : Text; karigar : Text; factory : ?Text }>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
  };

  type NewActor = {
    dailyOrders : Map.Map<Date, List.List<{ orderId : Text; design : Text; product : Text }>>;
    karigarAssignments : Map.Map<Date, Map.Map<Text, { orderId : Text; karigar : Text; factory : ?Text }>>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    designToKarigar : Map.Map<Text, Text>;
  };

  public func run(oldActor : OldActor) : NewActor {
    {
      dailyOrders = oldActor.dailyOrders.map(
        func(_date, ordersList) {
          ordersList.map<{ orderId : Text; product : Text }, { orderId : Text; design : Text; product : Text }>(
            func(oldOrder) {
              {
                orderId = oldOrder.orderId;
                design = "";
                product = oldOrder.product;
              };
            }
          );
        }
      );
      karigarAssignments = oldActor.karigarAssignments;
      userProfiles = oldActor.userProfiles;
      designToKarigar = Map.empty<Text, Text>();
    };
  };
};
