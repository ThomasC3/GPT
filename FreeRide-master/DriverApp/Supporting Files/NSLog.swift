//
//  NSLog.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/16/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

public func NSLog(_ format: String, _ args: CVarArg...) {
    let message = String(format: format, arguments:args)
    #if DEBUG
    print(message)
    #endif
}
