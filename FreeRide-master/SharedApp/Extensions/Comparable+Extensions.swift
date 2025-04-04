//
//  Comparable+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/18/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension Comparable {

    /// Clamps a comparable value within the range's bounds
    /// Example: `1.2.clamped(to: 0...1)` returns 1
    ///
    /// - Parameter range: The range to clamp the current value
    /// - Returns: A value within the closed range
    public func clamped(to range: ClosedRange<Self>) -> Self {
        if self > range.upperBound {
            return range.upperBound
        } else if self < range.lowerBound {
            return range.lowerBound
        } else {
            return self
        }
    }

    /// Clamps a comparable value within the range's bounds
    ///
    /// - Parameter range: The range to clamp the current value
    public mutating func clamp(to range: ClosedRange<Self>) {
        self = clamped(to: range)
    }
}
