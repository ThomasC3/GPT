//
//  UIViewController+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol DependencyInjectable {

    func injectDependencies()
}

extension UIViewController {

    var statusBarHeight: CGFloat {
        return UIApplication.shared.statusBarFrame.height
    }

    /// Loads a controller from a storyboard based on it's inferred class name.
    /// Example: `LoginViewController` will load `Login.storyboard` by dropping the `ViewController` suffix.
    ///
    /// - Returns: A newly instantiated view controller
    public static func instantiateFromStoryboard<T: UIViewController>() -> T {
        let storyboard = UIStoryboard(viewControllerType: T.self)
        let controller = storyboard.instantiateInitialViewController() as! T

        if let injectable = controller as? DependencyInjectable {
            injectable.injectDependencies()
        }

        return controller
    }

    /// Loads a controller from a storyboard based on a specified class name
    /// Example: `LoginViewController` will load `Login.storyboard` by dropping the `ViewController` suffix.
    ///
    /// - Returns: A newly instantiated view controller
    public static func instantiateFromStoryboard<T: UIViewController>(_ controllerType: T.Type) -> T {
        return instantiateFromStoryboard()
    }

    func presentAlert(for error: LocalizedError) {
        if error.localizedDescription.lowercased().contains("update circuit app") {
            let confirm = UIAlertAction(title: "Update Circuit", style: .default, handler: { _ in
                let urlStr = "itms-apps://itunes.apple.com/app/apple-store/id988052033?mt=8"
                UIApplication.shared.open(URL(string: urlStr)!, options: [:], completionHandler: nil)
            })
            presentAlert("Upgrade required".localize(), message: "You need to update Circuit app to the latest version in order to request rides".localize(), cancel: nil, confirm: confirm)
        } else if let errorDescription = error.errorDescription {
            if let helpAnchor = error.helpAnchor {
                presentAlert(helpAnchor.localize() + " " + "failed".localize(), message: errorDescription)
            }
            else {
                presentAlert("Something went wrong".localize(), message: errorDescription)
            }
        }
        else {
            presentAlert("Something went wrong".localize(), message: error.localizedDescription)
        }
    }

    func presentAlert(_ title: String?, message: String, action: String = "Ok") {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: action, style: .default))
        present(alert, animated: true)
    }

    func presentAlert(_ title: String?, message: String, cancel: String?, confirm: UIAlertAction) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        if cancel != nil {
            alert.addAction(UIAlertAction(title: cancel, style: .cancel))
        }
        alert.addAction(confirm)
        present(alert, animated: true)
    }
}
