import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

// Apply data migration on upgrades

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  type Date = Text;

  public type DailyOrder = {
    orderNo : Text;
    design : Text;
    weight : Text;
    size : Text;
    quantity : Text;
    remarks : Text;
  };

  type KarigarAssignment = {
    orderId : Text;
    karigar : Text;
    factory : ?Text;
  };

  public type UserProfile = {
    name : Text;
  };

  let dailyOrders = Map.empty<Date, List.List<DailyOrder>>();
  let karigarAssignments = Map.empty<Date, Map.Map<Text, KarigarAssignment>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Store only the reference to the karigar mapping workbook blob
  var karigarMappingWorkbook : ?Storage.ExternalBlob = null;

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func storeDailyOrders(date : Date, orders : [DailyOrder]) : async () {
    dailyOrders.add(date, List.fromArray<DailyOrder>(orders));
  };

  public shared ({ caller }) func assignKarigar(date : Date, orderIds : [Text], karigar : Text, factory : ?Text) : async () {
    let assignmentsForDate = switch (karigarAssignments.get(date)) {
      case (null) { Map.empty<Text, KarigarAssignment>() };
      case (?existing) { existing };
    };

    for (orderId in orderIds.values()) {
      let newAssignment : KarigarAssignment = {
        orderId;
        karigar;
        factory;
      };
      assignmentsForDate.add(orderId, newAssignment);
    };

    karigarAssignments.add(date, assignmentsForDate);
  };

  public query ({ caller }) func getKarigarAssignments(date : Date) : async [KarigarAssignment] {
    let assignments = switch (karigarAssignments.get(date)) {
      case (null) { Map.empty<Text, KarigarAssignment>() };
      case (?existing) { existing };
    };
    assignments.values().toArray();
  };

  public query ({ caller }) func getDailyOrders(date : Date) : async [DailyOrder] {
    switch (dailyOrders.get(date)) {
      case (null) { [] };
      case (?orders) { orders.toArray() };
    };
  };

  func compareKarigarAssignmentsByKarigar(a : KarigarAssignment, b : KarigarAssignment) : Order.Order {
    Text.compare(a.karigar, b.karigar);
  };

  public query ({ caller }) func getOrdersByKarigar(date : Date, karigar : Text) : async [DailyOrder] {
    let assignmentsForDate = switch (karigarAssignments.get(date)) {
      case (null) { Map.empty<Text, KarigarAssignment>() };
      case (?existing) { existing };
    };

    let filteredAssignments = assignmentsForDate.values().toArray().filter(
      func(a) { a.karigar == karigar }
    );

    let sortedAssignments = filteredAssignments.sort(compareKarigarAssignmentsByKarigar);
    let sortedOrders = List.empty<DailyOrder>();

    let dailyOrdersForDate = switch (dailyOrders.get(date)) {
      case (null) { List.empty<DailyOrder>() };
      case (?orders) { orders };
    };

    for (assignment in sortedAssignments.values()) {
      switch (dailyOrdersForDate.find(func(o) { o.orderNo == assignment.orderId })) {
        case (null) {};
        case (?order) { sortedOrders.add(order) };
      };
    };

    sortedOrders.toArray();
  };

  public shared ({ caller }) func saveKarigarMappingWorkbook(blob : Storage.ExternalBlob) : async () {
    karigarMappingWorkbook := ?blob;
  };

  public query ({ caller }) func getKarigarMappingWorkbook() : async ?Storage.ExternalBlob {
    karigarMappingWorkbook;
  };
};
