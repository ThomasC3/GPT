//
//  TextField.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/6/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol TextFieldDelegate: AnyObject {
    func didBeginEditing(textField: TextField)
    func didEndEditing(textField: TextField)
    func didClear(textField: TextField)
    func didReturn(textField: TextField)
    func didChangeText(in textField: TextField)
}

class TextField: UITextField {

    weak var additionalDelegate: TextFieldDelegate?

    var validators = [Validator]()
    
    var id: String?

    var defaultValue: String?

    var value: String {
        if trimmedText.isBlank() {
            return defaultValue ?? ""
        }
        else {
            return trimmedText
        }
    }

    var image: UIImage? {
        didSet {
            imageView.originalImage = image
        }
    }

    var maxLength: Int?

    private(set) var name: String?

    private lazy var imageView: ImageView = {
        let view = ImageView(frame: CGRect(x: 0, y: 0, width: 48, height: 48))
        view.contentMode = .center
        view.originalImage = image
        return view
    }()

    private lazy var stackView: UIStackView = {
        let view = UIStackView()
        view.axis = .vertical
        view.alignment = .fill
        view.distribution = .fill
        view.translatesAutoresizingMaskIntoConstraints = false

        return view
    }()

    var inputText: String {
        get { return text ?? "" }
        set { text = newValue }
    }

    var trimmedText: String {
        get { return text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "" }
        set { text = newValue.trimmingCharacters(in: .whitespacesAndNewlines) }
    }

    override var isSecureTextEntry: Bool {
        didSet {
            if isSecureTextEntry {
                spellCheckingType = .no
                autocorrectionType = .no
                autocapitalizationType = .none
            }
        }
    }

    override var keyboardType: UIKeyboardType {
        didSet {
            switch keyboardType {
            case .emailAddress:
                spellCheckingType = .no
                autocorrectionType = .no
                autocapitalizationType = .none
            default:
                return
            }
        }
    }

    init() {
        super.init(frame: .zero)
        initialize()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initialize()
    }

    func applyStyle() {
        leftView = imageView
        leftView?.constrainWidth(48)
        leftViewMode = .always
        font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.textField1!)
        self.adjustsFontForContentSizeCategory = true
        textColor = Theme.Colors.blueGray
        tintColor = Theme.Colors.blueGray
        cornerRadius = 6
        borderWidth = 1
        borderColor = Theme.Colors.gray.cgColor
    }

    func configure(name: String? = nil, placeholder: String, defaultValue: String? = nil) {
        self.name = name
        self.placeholder = placeholder
        self.defaultValue = defaultValue
    }

    func validate() -> Bool {
        let invalidValidator = validators.filter({ !$0.isValid(text) }).sorted(by: { $0.priority < $1.priority } ).first
        let isValid = invalidValidator == nil

        toggleErrorState(invalidValidator: invalidValidator)

        return isValid
    }

    func toggleErrorState(invalidValidator validator: Validator?) {
        let isVisible = validator != nil

        if isVisible {
            textColor = Theme.Colors.tangerine
            borderColor = Theme.Colors.tangerine.cgColor
            imageView.setImageColor(Theme.Colors.tangerine)
        } else {
            textColor = Theme.Colors.blueGray
            borderColor = Theme.Colors.gray.cgColor
            imageView.setImageColor(nil)
        }
    }

    private func initialize() {
        translatesAutoresizingMaskIntoConstraints = false
        backgroundColor = Theme.Colors.white
        delegate = self

        constrainHeight(48)
        applyStyle()

        Notification.addObserver(self, name: UITextField.textDidChangeNotification, selector: #selector(didChangeText), object: self)
    }

    func configureMember(of fields: [TextField], delegate: Any?) {
        additionalDelegate = delegate as? TextFieldDelegate
        returnKeyType = self == fields.last ? .done : .next

        if fields.count > 1 || keyboardType == .numberPad || keyboardType == .phonePad {
            inputAccessoryView = FieldAccessoryView(textField: self, in: fields, delegate: delegate as? FieldAccessoryViewDelegate)
        }
    }
}

extension TextField: UITextFieldDelegate {

    func textFieldDidBeginEditing(_ textField: UITextField) {
        additionalDelegate?.didBeginEditing(textField: self)
    }

    func textFieldDidEndEditing(_ textField: UITextField) {
        additionalDelegate?.didEndEditing(textField: self)
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        additionalDelegate?.didReturn(textField: self)
        return true
    }

    func textFieldShouldClear(_ textField: UITextField) -> Bool {
        additionalDelegate?.didClear(textField: self)
        return true
    }

    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        toggleErrorState(invalidValidator: nil)

        if let maxLength = maxLength, maxLength > 0 {
            let currentText = textField.text ?? ""
            guard
                let stringRange = Range(range, in: currentText)
            else {
                return false
            }

            let updatedText = currentText.replacingCharacters(in: stringRange, with: string)
            return updatedText.count <= maxLength
        }

        return true
    }

    @objc private func didChangeText() {
        additionalDelegate?.didChangeText(in: self)
    }

}
