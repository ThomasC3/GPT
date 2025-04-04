//
//  DateTextField.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 10/02/2025.
//  Copyright © 2025 Circuit. All rights reserved.
//

import UIKit

class DateTextField: TextField {

    static let defaultDateFormatter = DateFormatter(dateFormat: "MM/dd/yyyy")

    private lazy var datePicker: UIDatePicker = {
        let picker = UIDatePicker()
        picker.datePickerMode = .date
        if #available(iOS 13.4, *) {
            picker.preferredDatePickerStyle = .wheels
        }
        picker.calendar = Calendar(identifier: .gregorian)
        picker.addTarget(self, action: #selector(datePickerValueChanged), for: .valueChanged)
        return picker
    }()

    private var selectedDate: Date? {
        didSet {
            updateDisplayText()
        }
    }

    var displayFormatter: DateFormatter = defaultDateFormatter {
        didSet {
            updateDisplayText()
        }
    }

    var valueFormatter: DateFormatter = defaultDateFormatter {
        didSet {
            updateDisplayText()
        }
    }

    // Override value property from TextField
    override var value: String {
        if let selectedDate = selectedDate {
            return valueFormatter.string(from: selectedDate)
        }
        
        // Handle manual text input
        if let text = self.text, !text.isEmpty,
           let date = displayFormatter.date(from: text) {
            selectedDate = date
            return valueFormatter.string(from: date)
        }
        
        return ""
    }

    override init() {
        super.init()
        setupDatePicker()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setupDatePicker()
    }

    private func setupDatePicker() {
        inputView = datePicker

        // Add toolbar with Done button
        let toolbar = UIToolbar()
        toolbar.sizeToFit()

        let doneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(doneButtonTapped))
        let flexSpace = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
        toolbar.setItems([flexSpace, doneButton], animated: false)

        inputAccessoryView = toolbar
    }

    func setDate(_ date: Date?) {
        selectedDate = date
        if let date = date {
            datePicker.date = date
        }
    }

    func setDateString(_ dateString: String?) {
        guard let dateString = dateString,
              let date = valueFormatter.date(from: dateString) else {
            selectedDate = nil
            return
        }
        setDate(date)
    }

    private func updateDisplayText() {
        if let date = selectedDate {
            text = displayFormatter.string(from: date)
        } else {
            text = nil
        }
    }

    @objc private func datePickerValueChanged() {
        selectedDate = datePicker.date
    }

    @objc private func doneButtonTapped() {
        selectedDate = datePicker.date
        resignFirstResponder()
    }
}
