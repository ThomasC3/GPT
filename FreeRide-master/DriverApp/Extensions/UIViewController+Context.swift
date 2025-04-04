//
//  UIViewController+Context.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/24/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension UIViewController {

    var context: DriverAppContext {
        return DriverAppContext.shared
    }
}
