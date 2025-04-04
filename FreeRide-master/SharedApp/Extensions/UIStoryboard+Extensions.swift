//
//  UIStoryboard+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension UIStoryboard {

    /// Loads a storyboard from a controller's class name.
    /// Example: `LoginViewController.self` passed as the controllerType would load the storyboard file named `Login.storyboard`
    ///
    /// - Parameter viewControllerType: The controller type in which to load the storyboard from.
    public convenience init<T: UIViewController>(viewControllerType controllerType: T.Type) {
        var name = String(describing: T.self)

        if let range = name.range(of: "ViewController") {
            name = String(name[..<range.lowerBound])
        }

        self.init(name: name, bundle: Bundle(for: T.self))
    }
}
