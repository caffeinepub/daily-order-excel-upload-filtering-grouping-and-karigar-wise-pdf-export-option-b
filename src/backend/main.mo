import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type Date = Text; // ISO date string for upload date

  type Order = {
    orderId : Text;
    design : Text;
    product : Text;
  };

  type KarigarAssignment = {
    orderId : Text;
    karigar : Text;
    factory : ?Text;
  };

  public type UserProfile = {
    name : Text;
  };

  let dailyOrders = Map.empty<Date, List.List<Order>>();
  let karigarAssignments = Map.empty<Date, Map.Map<Text, KarigarAssignment>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let karigarMappingWorkbook = Map.empty<Text, Map.Map<Text, Text>>();

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

  // Users can write daily orders
  public shared ({ caller }) func storeDailyOrders(date : Date, orders : [Order]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can store daily orders");
    };
    dailyOrders.add(date, List.fromArray<Order>(orders));
  };

  // Users can write karigar assignments
  public shared ({ caller }) func assignKarigar(date : Date, orderIds : [Text], karigar : Text, factory : ?Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can assign karigars");
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

  // Any authenticated user including guests can read karigar assignments
  public query ({ caller }) func getKarigarAssignments(date : Date) : async [KarigarAssignment] {
    let assignments = switch (karigarAssignments.get(date)) {
      case (null) { Map.empty<Text, KarigarAssignment>() };
      case (?existing) { existing };
    };
    assignments.values().toArray();
  };

  // Any authenticated user including guests can read daily orders
  public query ({ caller }) func getDailyOrders(date : Date) : async [Order] {
    switch (dailyOrders.get(date)) {
      case (null) { [] };
      case (?orders) { orders.toArray() };
    };
  };

  func compareKarigarAssignmentsByKarigar(a : KarigarAssignment, b : KarigarAssignment) : Order.Order {
    Text.compare(a.karigar, b.karigar);
  };

  // Any authenticated user including guests can read orders by karigar
  public query ({ caller }) func getOrdersByKarigar(date : Date, karigar : Text) : async [Order] {
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

  // Admin-only function to save the master karigar mapping workbook
  public shared ({ caller }) func saveKarigarMappingWorkbook(workbook : [(Text, [(Text, Text)])]) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    let newWorkbook = Map.empty<Text, Map.Map<Text, Text>>();
    for ((sheetName, entries) in workbook.values()) {
      let sheet = Map.fromIter(entries.values());
      newWorkbook.add(sheetName, sheet);
    };
    karigarMappingWorkbook.clear();
    for ((sheetName, sheet) in newWorkbook.entries()) {
      karigarMappingWorkbook.add(sheetName, sheet);
    };
  };

  // Any authenticated user including guests can fetch the persistent karigar mapping workbook
  public query ({ caller }) func getKarigarMappingWorkbook() : async [(Text, [(Text, Text)])] {
    karigarMappingWorkbook.toArray().map(
      func((sheetName, entries)) {
        let sheetEntries = entries.toArray();
        (sheetName, sheetEntries);
      }
    );
  };

  // Any authenticated user including guests can fetch specific sheet
  public query ({ caller }) func getKarigarMappingSheet(sheetName : Text) : async ?[(Text, Text)] {
    switch (karigarMappingWorkbook.get(sheetName)) {
      case (null) { null };
      case (?sheet) { ?sheet.toArray() };
    };
  };

  // Any authenticated user including guests can get karigar from specific sheet
  public query ({ caller }) func getKarigarForDesign(sheetName : Text, design : Text) : async ?Text {
    switch (karigarMappingWorkbook.get(sheetName)) {
      case (null) { null };
      case (?sheet) { sheet.get(design) };
    };
  };

  // Any authenticated user including guests can read all karigar assignments for a design
  public query ({ caller }) func getKarigarAssignmentsForDesign(design : Text) : async [(Text, Text)] {
    let assignments : List.List<(Text, Text)> = List.empty<(Text, Text)>();
    for ((sheetName, entries) in karigarMappingWorkbook.entries()) {
      switch (entries.get(design)) {
        case (null) {};
        case (?karigar) {
          assignments.add((sheetName, karigar));
        };
      };
    };
    assignments.toArray();
  };
};
