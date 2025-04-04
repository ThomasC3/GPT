//
//  XCTest+Extensions.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 08/08/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import XCTest

extension XCUIElement {

    public func keyboardReturn() {
        typeText("\n")
    }

    @discardableResult
    func waitForExistence() -> Bool {
        let timeout = TimeInterval(10)
        return self.waitForExistence(timeout: timeout)
    }

    func clearText() {
        guard let stringValue = self.value as? String else {
            XCTFail("Tried to clear text in an empty TextField")
            return
        }
        let deleteString = String(repeating: XCUIKeyboardKey.delete.rawValue, count: stringValue.count)
        self.typeText(deleteString)
    }

}
