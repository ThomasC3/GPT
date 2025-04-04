//
//  UIApplication+Extensions.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 15/07/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import UIKit

extension UIApplication {

    var activeWindow: UIWindow? {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            return window
        }
        return nil
    }

}
