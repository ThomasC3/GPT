//
//  ValidatorTests.swift
//  RiderAppTests
//
//  Created by Ricardo Pereira on 14/02/2025.
//  Copyright © 2025 Circuit. All rights reserved.
//

import XCTest
@testable import RiderApp_Stage

class ValidatorTests: XCTestCase {

    // MARK: - BirthdayValidator Tests

    func testBirthdayValidator_WithValidDate_ReturnsTrue() {
        let validator = BirthdayValidator()
        let sixteenYearsAgo = Calendar.current.date(byAdding: .year, value: -16, to: Date())!
        let dateStr = DateFormatter(dateFormat: "MM/dd/yyyy").string(from: sixteenYearsAgo)

        XCTAssertTrue(validator.isValid(dateStr))
    }

    func testBirthdayValidator_WithUnder16_ReturnsFalse() {
        let validator = BirthdayValidator()
        let fifteenYearsAgo = Calendar.current.date(byAdding: .year, value: -15, to: Date())!
        let dateStr = DateFormatter(dateFormat: "MM/dd/yyyy").string(from: fifteenYearsAgo)

        XCTAssertFalse(validator.isValid(dateStr))
    }

    func testBirthdayValidator_WithInvalidFormat_ReturnsFalse() {
        let validator = BirthdayValidator()
        XCTAssertFalse(validator.isValid("2000-01-01"))
        XCTAssertFalse(validator.isValid(""))
        XCTAssertFalse(validator.isValid(nil))
    }

    // MARK: - RequiredValidator Tests

    func testRequiredValidator_WithValidInput_ReturnsTrue() {
        let validator = RequiredValidator()
        XCTAssertTrue(validator.isValid("test"))
        XCTAssertTrue(validator.isValid("123"))
    }

    func testRequiredValidator_WithEmptyOrWhitespace_ReturnsFalse() {
        let validator = RequiredValidator()
        XCTAssertFalse(validator.isValid(""))
        XCTAssertFalse(validator.isValid("   "))
        XCTAssertFalse(validator.isValid(nil))
    }

    // MARK: - PasswordValidator Tests

    func testPasswordValidator_WithValidPassword_ReturnsTrue() {
        let validator = PasswordValidator()
        XCTAssertTrue(validator.isValid("12345678"))
    }

    func testPasswordValidator_WithShortPassword_ReturnsFalse() {
        let validator = PasswordValidator()
        XCTAssertFalse(validator.isValid("123"))
        XCTAssertFalse(validator.isValid(""))
        XCTAssertFalse(validator.isValid(nil))
    }

}
