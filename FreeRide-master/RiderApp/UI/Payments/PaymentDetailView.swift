//
//  PaymentDetailView.swift
//  Circuit
//

import UIKit

protocol PaymentDetailDelegate: AnyObject {
    func didSelectEdit()
    func didSelectDelete()
}

class PaymentDetailView: UIView {
    
    weak var paymentDelegate: PaymentDetailDelegate?

    lazy var imageView: ImageView = {
        let view = ImageView(frame: CGRect(x: 0, y: 0, width: 48, height: 48))
        view.contentMode = .center
        view.tintColor = Theme.Colors.blueGray
        return view
    }()
    
    lazy var codeLabel: Label = {
        let label = Label()
        label.style = .body1darkgray
        label.textColor = Theme.Colors.blueGray
        return label
    }()
    
    lazy var infoLabel: Label = {
        let label = Label()
        label.style = .subtitle2darkgray
        label.textAlignment = .right
        label.numberOfLines = 2
        return label
    }()
    
    lazy var editButton: Button = {
        let button = Button()
        button.setTitle("general_edit".localize(), for: .normal)
        button.style = .primary
        button.addTarget(self, action: #selector(editAction), for: .touchUpInside)
        return button
    }()
    
    lazy var deleteButton: Button = {
        let button = Button()
        button.setTitle("general_remove".localize(), for: .normal)
        button.style = .cancel
        button.addTarget(self, action: #selector(deleteAction), for: .touchUpInside)
        return button
    }()
    
    private lazy var mainStackView: UIStackView = {
        let view = UIStackView()
        view.axis = .vertical
        view.alignment = .fill
        view.distribution = .equalCentering
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private lazy var labelsStackView: UIStackView = {
        let view = UIStackView()
        view.axis = .vertical
        view.alignment = .fill
        view.distribution = .fillEqually
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private lazy var titleStackView: UIStackView = {
        let view = UIStackView()
        view.axis = .horizontal
        view.alignment = .fill
        view.distribution = .equalCentering
        view.spacing = 10
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var buttonsStackView: UIStackView = {
        let view = UIStackView()
        view.axis = .horizontal
        view.alignment = .fill
        view.distribution = .fillEqually
        view.spacing = 20
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    init() {
        super.init(frame: .zero)
        initialize()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initialize()
    }

    func applyStyle() {
        tintColor = Theme.Colors.blueGray
        cornerRadius = 16
        borderWidth = 1
        borderColor = Theme.Colors.gray.cgColor
    }
    
    func configure(title: String?, info: String?) {

        let isEmpty = title == nil
    
        codeLabel.text = title ?? ""
        infoLabel.text = info ?? ""
        imageView.originalImage = #imageLiteral(resourceName: "round_credit_card_black_24pt")
        imageView.isHidden = isEmpty
        deleteButton.isHidden = isEmpty
        deleteButton.accessibilityLabel = "accessibility_text_remove_payment_method".localize()
        infoLabel.isHidden = info == nil
        infoLabel.style = isEmpty ? .subtitle3bluegray : .subtitle2darkgray
        infoLabel.textAlignment = isEmpty ? .center : .right
        editButton.setTitle(isEmpty ? "payments_add_card".localize() : "general_edit".localize(), for: .normal)
        editButton.accessibilityLabel = isEmpty ? "accessibility_text_add_payment_method".localize() : "accessibility_text_edit_payment_method".localize()
    }
    
    private func initialize() {
        translatesAutoresizingMaskIntoConstraints = false
        backgroundColor = Theme.Colors.white

        constrainHeight(170)
        
        addSubview(mainStackView)
        mainStackView.pinEdges(to: self, horizontalInset: 20, verticalInset: 20)
        
        titleStackView.addArrangedSubview(imageView)
        titleStackView.addArrangedSubview(codeLabel)
        
        buttonsStackView.addArrangedSubview(editButton)
        buttonsStackView.addArrangedSubview(deleteButton)
                
        labelsStackView.addArrangedSubview(titleStackView)
        labelsStackView.addArrangedSubview(infoLabel)
        
        mainStackView.addArrangedSubview(labelsStackView)
        mainStackView.addArrangedSubview(buttonsStackView)
        
        applyStyle()
    }
    
    @objc func editAction() {
        paymentDelegate?.didSelectEdit()
    }

    @objc func deleteAction() {
        paymentDelegate?.didSelectDelete()
    }

}
