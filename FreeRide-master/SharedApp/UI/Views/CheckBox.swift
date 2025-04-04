//
//  CheckBox.swift
//  FreeRide
//

import UIKit

class CheckBox: UIStackView {
    
    var isSelected = false
    
    var id: String?
    
    var image: UIImage? {
        didSet {
            imageView.originalImage = image
        }
    }
    
    private let titleLabel: Label = {
        let label = Label()
        label.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: Theme.Fonts.textField1!)
        label.adjustsFontForContentSizeCategory = true
        label.textColor = Theme.Colors.blueGray
        label.numberOfLines = 3
        return label
    }()
    
    private lazy var imageView: ImageView = {
        let view = ImageView(frame: CGRect(x: 0, y: 0, width: 24, height: 24))
        view.contentMode = .center
        view.originalImage = #imageLiteral(resourceName: "round_check_box_outline_blank_black_24pt")
        view.tintColor = Theme.Colors.blueGray
        view.constrainSize(CGSize(width: 48, height: 40))
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
        constrainHeight(40)
        addArrangedSubview(imageView)
        addArrangedSubview(titleLabel)
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(checkBoxTapped)))
            }
    
    func configure(title: String) {
        titleLabel.text = title
    }
    
    @objc private func checkBoxTapped() {
        isSelected = !isSelected
        image = isSelected ? #imageLiteral(resourceName: "round_check_box_black_24pt") : #imageLiteral(resourceName: "round_check_box_outline_blank_black_24pt")
        imageView.tintColor = isSelected ? Theme.Colors.seaFoam : Theme.Colors.blueGray
    }

}
