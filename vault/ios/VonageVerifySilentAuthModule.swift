//
//  VonageVerifySilentAuthModule.swift
//  VonageVault
//
//  Created by iujie on 20/02/2025.
//

import Foundation
import VonageClientSDKNumberVerification


@objc(VonageVerifySilentAuthModule)
class VonageVerifySilentAuthModule: NSObject {
  let client = VGNumberVerificationClient()

  @objc static func requiresMainQueueSetup() -> Bool { return true }
  
  @objc public func openWithDataCellular(
    _ url: String,
    debug: Bool,
     resolver resolve: @escaping RCTPromiseResolveBlock,
     rejecter reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
     let params = VGNumberVerificationParameters(url: url,
                                                 headers: ["x-my-header": "My Value"],
                                                 queryParameters: ["query-param" : "value"],
                                                 maxRedirectCount: 20)
    Task {
      do {
        let response = try await client.startNumberVerification(params: params, debug: debug)
        let status = response["http_status"] as? Int
        if (status == 200) {
          resolve("\(jsonToString(json: response as AnyObject))");
          
        } else {
          reject("Failed openWithDataCellular", "\(response["error_description"] ?? jsonToString(json: response as AnyObject))", "\(String(describing: status))" as? Error)
        }
      }
      catch {
        reject("Failed openWithDataCellular", error.localizedDescription, error)
      }
    }
   }
  
  func jsonToString(json: AnyObject) -> String{
      do {
          let data1 = try JSONSerialization.data(withJSONObject: json, options: JSONSerialization.WritingOptions.prettyPrinted)
          let convertedString = String(data: data1, encoding: String.Encoding.utf8) as NSString? ?? ""
          debugPrint(convertedString)
          return convertedString as String
      } catch let myJSONError {
          debugPrint(myJSONError)
          return ""
      }
  }
}

