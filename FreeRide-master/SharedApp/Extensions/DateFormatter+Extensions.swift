//
//  DateFormatter+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension DateFormatter {

    public convenience init(dateFormat: String) {
        self.init()
        self.calendar = Calendar(identifier: .gregorian)
        self.dateFormat = dateFormat
    }

    public convenience init(dateStyle: DateFormatter.Style, timeStyle: DateFormatter.Style = .none) {
        self.init()
        self.calendar = Calendar(identifier: .gregorian)
        self.dateStyle = dateStyle
        self.timeStyle = timeStyle
    }

}

extension Date {

    func isBetween(date date1: Date, andDate date2: Date) -> Bool {
        return date1.compare(self).rawValue * self.compare(date2).rawValue >= 0
    }
    
}
