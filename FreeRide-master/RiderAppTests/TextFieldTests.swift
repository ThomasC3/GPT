//
//  TextFieldTests.swift
//  RiderAppTests
//
//  Created by Ricardo Pereira on 14/02/2025.
//  Copyright © 2025 Circuit. All rights reserved.
//

import XCTest
@testable import RiderApp_Stage

class TextFieldTests: XCTestCase {
    var textField: TextField!

    override func setUp() {
        super.setUp()
        textField = TextField()
    }

    override func tearDown() {
        textField = nil
        super.tearDown()
    }

    func testTextField_WithRequiredValidator_ValidatesCorrectly() {
        textField.validators = [RequiredValidator()]
        textField.text = ""
        XCTAssertFalse(textField.validate())

        textField.text = "test"
        XCTAssertTrue(textField.validate())
    }

    func testTextField_WithMultipleValidators_ValidatesInPriorityOrder() {
        textField.validators = [RequiredValidator(), PasswordValidator()]

        textField.text = ""
        XCTAssertFalse(textField.validate())
        // Should fail on RequiredValidator first (priority 1)

        textField.text = "123"
        XCTAssertFalse(textField.validate())
        // Should fail on PasswordValidator (priority 2)

        textField.text = "12345678"
        XCTAssertTrue(textField.validate())
    }

    func testTextField_WithDefaultValue_ReturnsCorrectValue() {
        textField.defaultValue = "default"
        textField.text = ""
        XCTAssertEqual(textField.value, "default")

        textField.text = "test"
        XCTAssertEqual(textField.value, "test")
    }

    func testTextField_TrimsWhitespace() {
        textField.text = "  test  "
        XCTAssertEqual(textField.trimmedText, "test")
    }
}
