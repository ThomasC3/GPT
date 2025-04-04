//
//  Int+Extensions.swift
//  FreeRide
//

import Foundation

extension Int {
    func toPrice(with currency: String) -> String {
        let val = String(format: "%.2f", Float(self) / Float(100))
        return currency == "usd" ? "$\(val)" : "\(val)\(currency)"
    }
}
