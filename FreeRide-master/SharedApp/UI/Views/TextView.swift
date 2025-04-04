//
//  TextView.swift
//  FreeRide
//

import UIKit

protocol TextViewDelegate: AnyObject {
    func didBeginEditing(textView: TextView)
    func didEndEditing(textView: TextView)
}

class InternalTextView: UITextView {
    
    init() {
        super.init(frame: .zero, textContainer: nil)
        initialize()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initialize()
    }

    private func initialize() {
        constrainHeight(150)
        font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.textField1!)
        self.adjustsFontForContentSizeCategory = true
        tintColor = Theme.Colors.blueGray
    }
}

class TextView: UIStackView {
    
    weak var additionalDelegate: TextViewDelegate?
    
    var validators = [Validator]()
    
    var placeholder = ""
    
    var id: String?
    
    var image: UIImage? {
        didSet {
            imageView.originalImage = image
        }
    }
    
    var text: String {
        return textView.text == placeholder ? "" : textView.text
    }
    
    func dismissFocus() {
        textView.resignFirstResponder()
    }
    
    override var isFirstResponder: Bool {
        return textView.isFirstResponder
    }
    
    private let textView: InternalTextView = {
        let textView = InternalTextView()
        textView.textContainer.lineFragmentPadding = 0
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 0, bottom: 0, right: 0)
        return textView
    }()
    
    private lazy var imageView: ImageView = {
        let view = ImageView(frame: CGRect(x: 0, y: 0, width: 48, height: 48))
        view.contentMode = .center
        view.originalImage = image
        view.tintColor = Theme.Colors.blueGray
        view.constrainSize(CGSize(width: 48, height: 48))
        return view
    }()
    
    override func awakeFromNib() {
        super.awakeFromNib()
        initialize()
    }

    init() {
        super.init(frame: .zero)
        initialize()
    }
    
    required init(coder: NSCoder) {
        super.init(coder: coder)
        initialize()
    }
    
    private func initialize() {
        axis = .horizontal
        alignment = .top
        backgroundColor = Theme.Colors.white
        cornerRadius = 6
        borderWidth = 1
        borderColor = Theme.Colors.gray.cgColor
        addShadow()
        textView.delegate = self
        addArrangedSubview(imageView)
        addArrangedSubview(textView)
        textView.inputAccessoryView = TextViewAccessoryView(textView: self)
    }
    
    func configure(placeholder: String) {
        self.placeholder = placeholder
        resetTextView()
    }
    
    private func resetTextView() {
        textView.text = placeholder
        textView.textColor = Theme.Colors.placeholderGray
    }
    
    func validate() -> Bool {
        
        let textToCheck = textView.text == placeholder ? "" : textView.text
        
        let invalidValidator = validators.filter({ !$0.isValid(textToCheck) }).sorted(by: { $0.priority < $1.priority } ).first
        let isValid = invalidValidator == nil
        
        toggleErrorState(invalidValidator: invalidValidator)

        return isValid
    }
    
    func toggleErrorState(invalidValidator validator: Validator?) {
        let isVisible = validator != nil

        if isVisible {
            textView.textColor = Theme.Colors.tangerine
            borderColor = Theme.Colors.tangerine.cgColor
            imageView.setImageColor(Theme.Colors.tangerine)
        } else {
            textView.textColor = textView.text == placeholder ? Theme.Colors.placeholderGray : Theme.Colors.blueGray
            borderColor = Theme.Colors.gray.cgColor
            imageView.setImageColor(nil)
        }
    }

}

extension TextView: UITextViewDelegate {
    
    func textViewDidBeginEditing(_ textView: UITextView) {
        if textView.text == placeholder {
            self.resetTextView()
        }
        
        if textView.textColor == Theme.Colors.placeholderGray {
            textView.text = nil
            textView.textColor = Theme.Colors.blueGray
        }
        additionalDelegate?.didBeginEditing(textView: self)
    }
    
    func textViewDidEndEditing(_ textView: UITextView) {
        if textView.text.isEmpty || textView.text == placeholder {
            self.resetTextView()
        }
        additionalDelegate?.didEndEditing(textView: self)
    }

}

