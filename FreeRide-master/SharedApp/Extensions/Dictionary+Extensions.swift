//
//  Dictionary+Extensions.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 19/06/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import Foundation

extension Dictionary {

    /// Merge immutable dictionaries
    public static func +(lhs: Dictionary, rhs: Dictionary?) -> Dictionary {
        guard let rhs = rhs else {
            return lhs
        }
        return lhs.merging(rhs, uniquingKeysWith: { current, new in new })
    }

    /// Merge mutable dictionaries
    public static func +=(lhs: inout Dictionary, rhs: Dictionary?) {
        guard let rhs = rhs else {
            return
        }
        lhs.merge(rhs, uniquingKeysWith: { current, new in new })
    }

}
