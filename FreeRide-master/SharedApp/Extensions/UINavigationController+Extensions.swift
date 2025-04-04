//
//  UINavigationController+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension UINavigationController {

    /// Pops to the view controller of the specified type closest to the top of the stack
    ///
    /// - Parameters:
    ///   - ofClass: Type of class to find
    ///   - animated: If animation is enabled
    /// - Returns: View controller if found else nil
    @discardableResult
    public func popToController<T: UIViewController>(ofClass: T.Type, animated: Bool) -> T? {
        for controller in viewControllers.reversed() where controller is T {
            popToViewController(controller, animated: animated)
            return controller as? T
        }

        return nil
    }

    /// Determines if a specific type of view controller is currently on the navigation stack.
    ///
    /// - Parameters:
    ///   - type: The type of view controller to check for.
    /// - Returns: A boolean indicating whether the specified view controller type exists in the navigation stack.
    func isControllerOnStack<T: UIViewController>(ofClass: T.Type) -> Bool {
        return viewControllers.contains(where: { $0 is T })
    }

}
