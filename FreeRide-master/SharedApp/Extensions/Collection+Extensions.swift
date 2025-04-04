//
//  Collection+Extensions.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 28/03/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import Foundation

extension Collection {

    /// Returns the element at the specified index if it exists, otherwise nil.
    subscript (safe index: Index) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }

}
