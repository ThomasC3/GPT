//
//  Notification+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension Notification {

    /// Returns the value at key "value" inside userInfo, which can be passed in
    /// using the static function `post` on Notification
    public var value: Any? {
        return userInfo?["value"]
    }

    /// Posts a notififcation to NotificationCenter.default
    ///
    /// - Parameters:
    ///   - name: Name of the notification that will be posted
    ///   - sender: Optional sender of the notification
    ///   - value: Optional value to be passed in the notification
    public static func post(_ name: Notification.Name, sender: Any? = nil, value: Any? = nil) {
        var userInfo = [AnyHashable: Any]()

        if let value = value {
            userInfo["value"] = value
        }

        NotificationCenter.default.post(name: name, object: sender, userInfo: userInfo)
    }

    /// Adds an observer to NotificationCenter.default for the given notification, responding with the given selector
    ///
    /// - Parameters:
    ///   - observer: Object registering as an observer
    ///   - name: Name of the notification the observer will observe
    ///   - selector: Selector which specifies how the observer will respond to the notification
    ///   - object: The optional object whose notifications the observer wants to receive
    public static func addObserver(_ observer: Any, name: Notification.Name, selector: Selector, object: Any? = nil) {
        NotificationCenter.default.addObserver(observer, selector: selector, name: name, object: object)
    }

    /// Removes an observer to NotificationCenter.default for the given notification
    ///
    /// - Parameters:
    ///   - observer: Object to be removed as observer to notification
    ///   - name: Name of the notification which the observer will be removed from observing
    ///   - object: The optional object whose notifications the observer no longer wants to receive
    public static func removeObserver(_ observer: Any, name: Notification.Name, object: Any? = nil) {
        NotificationCenter.default.removeObserver(observer, name: name, object: object)
    }
}
