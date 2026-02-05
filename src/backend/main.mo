import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Order "mo:core/Order";
import Array "mo:core/Array";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type Date = Text; // ISO date string for upload date

  type Order = {
    orderId : Text;
    product : Text;
    // any other fields from Excel import
  };

  type KarigarAssignment = {
    orderId : Text;
    karigar : Text; // Karigar's name
    factory : ?Text; // Optional factory name
  };

  public type UserProfile = {
    name : Text;
  };

  // Persistent storage
  let dailyOrders = Map.empty<Date, List.List<Order>>();
  let karigarAssignments = Map.empty<Date, Map.Map<Text, KarigarAssignment>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // User profile management
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

  // Order management functions
  public shared ({ caller }) func storeDailyOrders(date : Date, orders : [Order]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin can upload orders");
    };
    dailyOrders.add(date, List.fromArray<Order>(orders));
  };

  public shared ({ caller }) func assignKarigar(date : Date, orderIds : [Text], karigar : Text, factory : ?Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin can assign karigar");
    };

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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view karigar assignments");
    };
    let assignments = switch (karigarAssignments.get(date)) {
      case (null) { Map.empty<Text, KarigarAssignment>() };
      case (?existing) { existing };
    };
    assignments.values().toArray();
  };

  public query ({ caller }) func getDailyOrders(date : Date) : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view daily orders");
    };
    switch (dailyOrders.get(date)) {
      case (null) { [] };
      case (?orders) { orders.toArray() };
    };
  };

  func compareKarigarAssignmentsByKarigar(a : KarigarAssignment, b : KarigarAssignment) : Order.Order {
    Text.compare(a.karigar, b.karigar);
  };

  public query ({ caller }) func getOrdersByKarigar(date : Date, karigar : Text) : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders by karigar");
    };
    let assignmentsForDate = switch (karigarAssignments.get(date)) {
      case (null) { Map.empty<Text, KarigarAssignment>() };
      case (?existing) { existing };
    };

    let filteredAssignments = assignmentsForDate.values().toArray().filter(
      func(a) { a.karigar == karigar }
    );

    let sortedAssignments = filteredAssignments.sort(compareKarigarAssignmentsByKarigar);
    let sortedOrders = List.empty<Order>();

    let dailyOrdersForDate = switch (dailyOrders.get(date)) {
      case (null) { List.empty<Order>() };
      case (?orders) { orders };
    };

    for (assignment in sortedAssignments.values()) {
      switch (dailyOrdersForDate.find(func(o) { o.orderId == assignment.orderId })) {
        case (null) {};
        case (?order) { sortedOrders.add(order) };
      };
    };

    sortedOrders.toArray();
  };
};
